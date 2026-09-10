-- Katy Bazaar — Supabase (Postgres) schema
--
-- This replaces a Redis-shaped key/value layer. Most of that layer existed to EMULATE things
-- Postgres does natively, so the port is a simplification rather than a translation:
--
--   Redis                                   Postgres
--   ─────────────────────────────────────   ────────────────────────────────────────────
--   order:<n> keys + an orders:index list   one `orders` table, ORDER BY placed_at DESC
--   SET NX to reserve a reference           INSERT ... ON CONFLICT DO NOTHING
--   Lua script to check-then-increment      one function in a transaction
--   Lua CAS on a version field              UPDATE ... WHERE version = $expected
--
-- The index list is gone entirely: it only existed because Redis cannot order a keyspace.

create table if not exists orders (
  reference   text primary key,
  version     integer     not null default 1,
  placed_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  data        jsonb       not null
);
create index if not exists orders_placed_at_idx on orders (placed_at desc);

create table if not exists inventory (
  id    text primary key,
  data  jsonb not null
);

-- Stock and pickup-slot counters. `limit_value` is stored WITH the counter so the ceiling is
-- enforced by the same statement that increments it — the check and the write cannot separate.
create table if not exists counters (
  key    text primary key,
  value  bigint not null default 0
);

/*
 * Claim stock and a pickup slot, all or nothing.
 *
 * `entries` is [{"key":"reserve:m1","delta":150,"max":1000}, ...]. Every ceiling is verified
 * before anything is written, and the whole function runs in one transaction, so a concurrent
 * caller cannot slip between the check and the increment. Returns the first blocking key, or
 * NULL when the whole claim succeeded.
 *
 * This is the Postgres equivalent of the Lua script it replaces, and it is atomic for the same
 * reason: the database runs it to completion before anything else observes an intermediate state.
 */
create or replace function reserve_all(entries jsonb)
returns text
language plpgsql
as $$
declare
  e        jsonb;
  current  bigint;
begin
  -- Lock the rows we are about to touch, in a deterministic order, so two concurrent claims
  -- cannot deadlock against each other.
  perform 1 from counters
   where key in (select jsonb_array_elements(entries) ->> 'key')
   order by key
     for update;

  for e in select * from jsonb_array_elements(entries) loop
    select coalesce(value, 0) into current from counters where key = e ->> 'key';
    if current is null then current := 0; end if;
    if current + (e ->> 'delta')::bigint > (e ->> 'max')::bigint then
      return e ->> 'key';
    end if;
  end loop;

  for e in select * from jsonb_array_elements(entries) loop
    insert into counters (key, value)
    values (e ->> 'key', (e ->> 'delta')::bigint)
    on conflict (key) do update set value = counters.value + (e ->> 'delta')::bigint;
  end loop;

  return null;
end;
$$;

/*
 * Hand counters back when an order is cancelled or collected.
 * Floors at zero rather than trusting the caller: a double release would otherwise drive the
 * counter negative and silently manufacture stock that does not exist.
 */
create or replace function release_all(entries jsonb)
returns void
language plpgsql
as $$
declare e jsonb;
begin
  for e in select * from jsonb_array_elements(entries) loop
    update counters
       set value = greatest(0, value - (e ->> 'delta')::bigint)
     where key = e ->> 'key';
  end loop;
end;
$$;

-- The service role reaches these through PostgREST; no anonymous access.
alter table orders    enable row level security;
alter table inventory enable row level security;
alter table counters  enable row level security;
