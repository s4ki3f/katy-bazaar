import "server-only";
import { kvGet } from "./kv";
import { products as compiled, type Product } from "@/lib/products";

type InventoryState = {
  patches: Record<string, Partial<Product>>;
  added: Product[];
  hidden: string[];
};

/**
 * The catalog as the shop has actually configured it, resolved on the
 * server so customers see live prices and stock.
 *
 * Under the old static export this was impossible: pages were frozen at
 * build time, so a price change in the counter app never reached anybody.
 * Now the shop edits inventory and the storefront reflects it on the next
 * request.
 */
export async function getCatalog(): Promise<Product[]> {
  const state = await kvGet<InventoryState>("inventory");
  if (!state) return compiled;

  const patched = compiled
    .filter((p) => !(state.hidden ?? []).includes(p.id))
    .map((p) => ({ ...p, ...(state.patches?.[p.id] ?? {}) }));

  return [...(state.added ?? []), ...patched];
}
