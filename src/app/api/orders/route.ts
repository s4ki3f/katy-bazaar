import { kvGet, kvSet, kvAvailable, KvUnavailableError } from "@/lib/server/kv";
import { roleFromRequest } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "orders";

type StoredOrder = { reference: string; status?: string; [k: string]: unknown };

function unavailable() {
  return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
}

/** Staff read the queue. Requires a session. */
export async function GET(request: Request) {
  if (!kvAvailable) return unavailable();
  if (!roleFromRequest(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }
  const orders = (await kvGet<StoredOrder[]>(KEY)) ?? [];
  return Response.json(orders);
}

/**
 * Customers place orders. Deliberately unauthenticated — a shopper has no
 * account — but the payload is normalised and the server stamps status and
 * receipt time rather than trusting the client for either.
 */
export async function POST(request: Request) {
  if (!kvAvailable) return unavailable();

  let order: StoredOrder;
  try {
    order = (await request.json()) as StoredOrder;
  } catch {
    return Response.json({ error: "Malformed order." }, { status: 400 });
  }
  if (!order?.reference || !Array.isArray(order.lines)) {
    return Response.json({ error: "Order is missing a reference or lines." }, { status: 400 });
  }

  try {
    const orders = (await kvGet<StoredOrder[]>(KEY)) ?? [];
    if (orders.some((o) => o.reference === order.reference)) {
      return Response.json({ ok: true, duplicate: true }); // idempotent retry
    }
    const received = {
      ...order,
      status: "new",
      receivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kvSet(KEY, [received, ...orders].slice(0, 500));
    return Response.json({ ok: true, reference: order.reference }, { status: 201 });
  } catch (e) {
    if (e instanceof KvUnavailableError) return unavailable();
    return Response.json({ error: "Could not store the order." }, { status: 500 });
  }
}
