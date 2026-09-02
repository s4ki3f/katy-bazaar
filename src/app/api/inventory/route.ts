import { kvGet, kvSet, kvAvailable, KvUnavailableError } from "@/lib/server/kv";
import { roleFromRequest } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/** Only signed-in staff change the catalog. */
export async function PUT(request: Request) {
  if (!kvAvailable) {
    return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
  }
  if (!roleFromRequest(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }
  try {
    await kvSet(KEY, await request.json());
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not save inventory." }, { status: 500 });
  }
}
