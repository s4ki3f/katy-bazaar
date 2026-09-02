"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { products } from "@/lib/products";
import {
  getOrderStore, isLocalOnly, LocalOrderStore, adminEnabled,
  type CounterOrder, type OrderStatus, type PickState,
} from "@/lib/admin/store";
import { authConfigured, hasSession, signOut } from "@/lib/admin/auth";
import { settleOrder, settledLineTotal, lineIsWeighed } from "@/lib/admin/totals";

const STATUSES: { id: OrderStatus; label: string; next?: OrderStatus; cta?: string }[] = [
  { id: "new", label: "New", next: "picking", cta: "Start picking" },
  { id: "picking", label: "Picking", next: "ready", cta: "Mark ready" },
  { id: "ready", label: "Ready", next: "collected", cta: "Mark collected" },
  { id: "collected", label: "Collected" },
];

/** sessionStorage is external mutable state; useSyncExternalStore reads it
 *  without a setState-in-effect and gives a correct server snapshot. */
const noopSubscribe = () => () => {};

export default function CounterPage() {
  const enabled = adminEnabled();
  const router = useRouter();
  const authed = useSyncExternalStore(
    noopSubscribe,
    () => !authConfigured() || hasSession(),
    () => false,
  );

  // When sign-in is wired up, no session means no order data is fetched at all.
  useEffect(() => {
    if (enabled && authConfigured() && !hasSession()) router.replace("/admin/login");
  }, [enabled, router]);

  if (!enabled) return <AdminDisabled />;
  if (!authed) return <p className="mx-auto max-w-md px-6 py-24 text-center text-muted-foreground">Checking your session…</p>;

  return <Counter />;
}

function AdminDisabled() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Counter app is not enabled here</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This build does not include the order screens. A static export cannot authenticate anyone,
        so publishing them would expose customer names and phone numbers to anyone with the URL.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Deploy the counter app separately with <code className="font-mono">NEXT_PUBLIC_ENABLE_ADMIN=true</code>{" "}
        onto a host that can put a login in front of it.
      </p>
    </div>
  );
}

function Counter() {
  const router = useRouter();
  const store = useMemo(() => getOrderStore(), []);
  const [orders, setOrders] = useState<CounterOrder[]>([]);
  const [tab, setTab] = useState<OrderStatus>("new");
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setOrders(await store.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
    } finally {
      setLoaded(true);
    }
  }, [store]);

  // Initial load. State is only touched after the await, and an `alive`
  // guard stops a slow response from writing to an unmounted component.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await store.list();
        if (!alive) return;
        setOrders(data);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load orders.");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [store]);

  const inTab = orders.filter((o) => o.status === tab);
  const current = orders.find((o) => o.reference === selected) ?? inTab[0] ?? null;

  async function update(next: CounterOrder) {
    next.updatedAt = new Date().toISOString();
    setOrders((prev) => prev.map((o) => (o.reference === next.reference ? next : o)));
    setSelected(next.reference);
    try { await store.save(next); } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  function setPick(o: CounterOrder, idx: number, pick: PickState) {
    const lines = o.lines.map((l, i) => (i === idx ? { ...l, pick } : l));
    void update({ ...o, lines, status: o.status === "new" ? "picking" : o.status });
  }
  function setWeight(o: CounterOrder, idx: number, value: string) {
    const n = value === "" ? undefined : Math.max(0, Number(value));
    const lines = o.lines.map((l, i) => (i === idx ? { ...l, actualQty: Number.isFinite(n as number) ? n : undefined } : l));
    void update({ ...o, lines });
  }

  async function seedDemo() {
    const s = new LocalOrderStore();
    const stamp = Date.now();
    await s.accept({
      reference: "KB-482 193",
      placedAt: new Date(stamp).toISOString(),
      customer: { name: "Ayesha R.", phone: "(281) 555-0101", email: "ayesha@example.com" },
      pickupSlot: "Today, 2:00 PM – 3:00 PM",
      notes: "Please keep the bones separate — for yakhni.",
      lines: [
        { productId: "m3", name: "Goat Meat (Bone-In)", unit: "per lb", qty: 5, lineTotal: 47.45, cut: "Curry cut (bone-in)", allowSubstitution: false },
        { productId: "m2", name: "Fresh Ground Beef (Lean)", unit: "per lb", qty: 2, lineTotal: 10.98, cut: "Keema (ground)", allowSubstitution: true },
        { productId: "r1", name: "Premium Basmati Rice", unit: "10 lb bag", qty: 1, lineTotal: 18.99, allowSubstitution: true },
        { productId: "n1", name: "Gulab Jamun (Tin)", unit: "1 kg tin", qty: 1, lineTotal: 6.99, allowSubstitution: true },
      ],
      subtotal: 84.41, tax: 0.58, total: 84.99, hasWeighedItems: true,
    });
    await refresh();
  }

  const settle = current ? settleOrder(current) : null;
  const stage = STATUSES.find((s) => s.id === current?.status);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {!authConfigured() && (
      <div className="rounded-card border-2 border-destructive bg-destructive/5 p-4 print:hidden">
        <p className="font-display font-bold text-destructive">This page is not protected</p>
        <p className="mt-1 text-sm text-foreground/80">
          A static export cannot authenticate anyone. Anyone who knows the URL can open this and read
          customer names and phone numbers. Before it holds real orders it must move to a host that can
          put a login in front of it — Vercel, Netlify or similar — or be built into a separate,
          private deployment.
        </p>
      </div>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Counter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pickup orders, in the order they came in.
            {isLocalOnly() && " Storing locally in this browser — set NEXT_PUBLIC_ORDERS_API to share across devices."}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          {isLocalOnly() && (
            <button onClick={seedDemo} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
              Add sample order
            </button>
          )}
          <button onClick={() => void refresh()} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
            Refresh
          </button>
          {authConfigured() && (
            <button
              onClick={() => { signOut(); router.replace("/admin/login"); }}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2 print:hidden" role="group" aria-label="Filter by status">
        {STATUSES.map((s) => {
          const n = orders.filter((o) => o.status === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => { setTab(s.id); setSelected(null); }}
              aria-pressed={tab === s.id}
              className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                tab === s.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
              }`}
            >
              {s.label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {!loaded ? (
        <p className="mt-10 text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface p-10 text-center">
          <p className="font-display text-lg font-bold">No orders yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Orders placed on the storefront land here once the site posts to a shared endpoint. Until
            then, add a sample order to walk through the picking flow.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* queue */}
          <div className="space-y-2 print:hidden">
            {inTab.length === 0 && <p className="text-sm text-muted-foreground">Nothing in {tab}.</p>}
            {inTab.map((o) => (
              <button
                key={o.reference}
                onClick={() => setSelected(o.reference)}
                aria-pressed={current?.reference === o.reference}
                className={`w-full rounded-card border-2 p-4 text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                  current?.reference === o.reference ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/40"
                }`}
              >
                <div className="font-display text-lg font-bold tabular-nums">{o.reference}</div>
                <div className="text-sm text-muted-foreground">{o.customer.name}</div>
                <div className="mt-1 text-xs font-semibold text-primary">{o.pickupSlot}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {o.lines.length} lines · {money(o.total)}
                </div>
              </button>
            ))}
          </div>

          {/* pick ticket */}
          {current && settle && (
            <div className="rounded-card border border-border bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pickup ID</p>
                  <p className="font-display text-3xl font-bold tabular-nums text-primary">{current.reference}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">{current.customer.name}</span>
                    <span className="text-muted-foreground"> · {current.customer.phone}</span>
                  </p>
                  <p className="text-sm font-semibold text-primary">{current.pickupSlot}</p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button onClick={() => window.print()} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
                    Print ticket
                  </button>
                  {stage?.next && (
                    <button
                      onClick={() => void update({ ...current, status: stage.next! })}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark cursor-pointer"
                    >
                      {stage.cta}
                    </button>
                  )}
                </div>
              </div>

              {current.notes && (
                <p className="border-b border-border bg-muted p-4 text-sm">
                  <span className="font-semibold">Note from customer: </span>{current.notes}
                </p>
              )}

              <ul className="divide-y divide-border">
                {current.lines.map((l, i) => {
                  const weighed = lineIsWeighed(l);
                  const p = products.find((x) => x.id === l.productId);
                  return (
                    <li key={`${l.productId}-${i}`} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-semibold">
                            {l.name}
                            <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                              {l.qty}{weighed ? " lb" : ` × ${l.unit}`}
                            </span>
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {l.cut && (
                              <span className="rounded border border-primary/40 bg-primary/5 px-2 py-0.5 text-xs font-bold text-primary">
                                ✎ {l.cut}
                              </span>
                            )}
                            {!l.allowSubstitution && (
                              <span className="rounded border border-destructive/40 bg-destructive/5 px-2 py-0.5 text-xs font-bold text-destructive">
                                No substitutions
                              </span>
                            )}
                            {p?.taxClass === "taxable" && (
                              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">taxable</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="font-semibold">{money(settledLineTotal(l))}</div>
                          {settledLineTotal(l) !== l.lineTotal && (
                            <div className="text-xs text-muted-foreground line-through">{money(l.lineTotal)}</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
                        {(["picked", "unavailable", "pending"] as PickState[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => setPick(current, i, st)}
                            aria-pressed={l.pick === st}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                              l.pick === st
                                ? st === "unavailable"
                                  ? "border-destructive bg-destructive/10 text-destructive"
                                  : "border-primary bg-primary/5 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {st === "picked" ? "Picked" : st === "unavailable" ? "Out of stock" : "Not yet"}
                          </button>
                        ))}
                        {weighed && (
                          <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                            Actual weight
                            <input
                              type="number" min="0" step="0.01" inputMode="decimal"
                              value={l.actualQty ?? ""}
                              placeholder={String(l.qty)}
                              onChange={(e) => setWeight(current, i, e.target.value)}
                              className="w-20 rounded-lg border border-field bg-surface px-2 py-1 text-right text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Actual weight in pounds for ${l.name}`}
                            />
                            lb
                          </label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-border p-5">
                <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Ordered</dt><dd className="tabular-nums">{money(current.total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal picked</dt><dd className="tabular-nums">{money(settle.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Sales tax</dt><dd className="tabular-nums">{money(settle.tax)}</dd></div>
                  <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                    <dt>To collect</dt><dd className="tabular-nums">{money(settle.total)}</dd>
                  </div>
                  {settle.difference !== 0 && (
                    <p className={`pt-1 text-xs font-semibold ${settle.difference < 0 ? "text-primary" : "text-destructive"}`}>
                      {settle.difference < 0 ? "Down " : "Up "}{money(Math.abs(settle.difference))} on the online estimate
                      {settle.unavailable > 0 && ` · ${settle.unavailable} out of stock`}
                    </p>
                  )}
                  {settle.outstanding > 0 && (
                    <p className="pt-1 text-xs text-muted-foreground">{settle.outstanding} line(s) still to pick</p>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
