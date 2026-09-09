import { dbAvailable as kvAvailable, DbUnavailableError as KvUnavailableError } from "@/lib/server/db";
import { getOrder, updateOrder } from "@/lib/server/orders-repo";
import { requireRole } from "@/lib/server/session";

export const runtime = "nodejs";

type StoredOrder = { reference: string; [k: string]: unknown };

/**
 * Staff update an order as they pick it. Requires a session.
 *
 * This used to load every order, map over the whole array and write all of them back, so a save
 * here erased any order that arrived between the read and the write — a customer's order vanishing
 * because a staff member happened to press a button. It now writes ONE key: the order named in the
 * path. Nothing else is touched, so there is nothing else to lose.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ reference: string }> }) {
  if (!kvAvailable) {
    return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
  }
  // Picking and settling an order is the counter job, so both roles may do it.
  const auth = requireRole(request, ["admin", "staff"]);
  if (!auth.ok) return auth.response;

  const { reference } = await ctx.params;
  const decoded = decodeURIComponent(reference);

  let incoming: unknown;
  try {
    incoming = await request.json();
  } catch {
    return Response.json({ error: "Malformed order." }, { status: 400 });
  }
  // A body of `null` used to spread into `{}` and replace the order with an empty object that kept
  // only its reference — a silent deletion dressed as an update.
  if (incoming === null || typeof incoming !== "object" || Array.isArray(incoming)) {
    return Response.json({ error: "Order update must be an object." }, { status: 400 });
  }

  const result = await updateOrder(decoded, incoming as StoredOrder);
  if (!result.ok && result.code === "no_such_order") {
    return Response.json({ error: "No such order." }, { status: 404 });
  }
  if (!result.ok) {
    // 409 with the CURRENT record attached. Answering a bare error would leave the tablet holding a
    // snapshot it cannot tell is stale, and its next save would be refused too — forever. Handing
    // back the truth lets it show what actually happened and rebase.
    return Response.json(
      {
        error: "Someone else updated this order while you were working on it.",
        errors: result.errors,
        current: result.current,
      },
      { status: 409 },
    );
  }
  return Response.json({ ok: true, version: result.order.version, order: result.order });
}

/** Read one order. Requires a session — it carries a customer's name and phone number. */
export async function GET(request: Request, ctx: { params: Promise<{ reference: string }> }) {
  if (!kvAvailable) {
    return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
  }
  const auth = requireRole(request, ["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { reference } = await ctx.params;
  const order = await getOrder(decodeURIComponent(reference));
  if (!order) return Response.json({ error: "No such order." }, { status: 404 });
  return Response.json(order);
}
