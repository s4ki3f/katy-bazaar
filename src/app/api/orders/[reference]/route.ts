import { kvGet, kvSet, kvAvailable, KvUnavailableError } from "@/lib/server/kv";
import { roleFromRequest } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "orders";
type StoredOrder = { reference: string; [k: string]: unknown };

/** Staff update an order as they pick it. Requires a session. */
export async function PUT(request: Request, ctx: { params: Promise<{ reference: string }> }) {
  if (!kvAvailable) {
    return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
  }
  if (!roleFromRequest(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  const { reference } = await ctx.params;
  let incoming: StoredOrder;
  try {
    incoming = (await request.json()) as StoredOrder;
  } catch {
    return Response.json({ error: "Malformed order." }, { status: 400 });
  }

  const orders = (await kvGet<StoredOrder[]>(KEY)) ?? [];
  const decoded = decodeURIComponent(reference);
  if (!orders.some((o) => o.reference === decoded)) {
    return Response.json({ error: "No such order." }, { status: 404 });
  }

  await kvSet(
    KEY,
    orders.map((o) =>
      o.reference === decoded ? { ...incoming, reference: decoded, updatedAt: new Date().toISOString() } : o,
    ),
  );
  return Response.json({ ok: true });
}
