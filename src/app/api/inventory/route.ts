import { kvGet, kvSet, kvAvailable, KvUnavailableError } from "@/lib/server/kv";
import { requireRole } from "@/lib/server/session";
import { validateInventoryState, authorizeInventoryChange } from "@/domain";

export const runtime = "nodejs";

const KEY = "inventory";
const EMPTY = { patches: {}, added: [], hidden: [] };

/**
 * Public on purpose: the storefront reads this so the shop's own price and
 * stock edits reach customers. It exposes nothing a shopper cannot already
 * see on a product page.
 */
export async function GET() {
  if (!kvAvailable) return Response.json(EMPTY);
  return Response.json((await kvGet(KEY)) ?? EMPTY);
}

/**
 * Change the catalog overlay.
 *
 * Two things used to be missing here, and they are the same mistake at different depths.
 *
 * ROUTE LEVEL: the handler called `roleFromRequest` and tested it for truthiness, so it asked "is
 * this anybody?" and threw away the role the signed token had just told it. Both roles passed.
 *
 * FIELD LEVEL: the counter UI has always drawn the real line — `InventoryPanel` says "staff keep
 * the shelves honest; only admin changes what a thing is or costs", and renders price, unit and tax
 * class as plain text for staff. But that line lived only in the browser. A staff token plus one
 * curl could set any price to a penny, and the storefront would serve it. Route-level roles alone
 * cannot express that rule, because staff legitimately PUT to this same endpoint to correct stock.
 *
 * So the body is validated, then the DIFF against what is currently stored is authorised: admin may
 * change anything; staff may change only `stock`. The comparison is canonical, not
 * `JSON.stringify` of the raw objects, so a staff edit is not refused merely because the client
 * serialised the same fields in a different order.
 */
export async function PUT(request: Request) {
  if (!kvAvailable) {
    return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
  }
  const auth = requireRole(request, ["admin", "staff"]);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed inventory.", errors: [{ code: "malformed_json" }] }, { status: 400 });
  }

  // Previously the raw parsed body went straight to storage. A single bad price then reached every
  // checkout through the pricing catalog, so validating here protects order intake too.
  const validated = validateInventoryState(body);
  if (!validated.ok) {
    return Response.json(
      { error: "That inventory update was rejected.", errors: validated.errors },
      { status: 400 },
    );
  }

  try {
    const current = (await kvGet<typeof EMPTY>(KEY)) ?? EMPTY;
    const allowed = authorizeInventoryChange(auth.role, current, validated.value);
    if (!allowed.ok) {
      return Response.json(
        {
          error: "Your account may only change stock levels. Ask an admin to change prices or the product list.",
          errors: allowed.errors,
        },
        { status: 403 },
      );
    }
    await kvSet(KEY, validated.value);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof KvUnavailableError) {
      return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
    }
    return Response.json({ error: "Could not save inventory." }, { status: 500 });
  }
}
