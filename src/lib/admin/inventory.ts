"use client";

// ─────────────────────────────────────────────────────────────
//  COUNTER APP — INVENTORY
//
//  The catalog in src/lib/products.ts is static and compiled in. This
//  module keeps an OVERLAY on top of it — edits, new items and hidden
//  items — so the shop can manage stock without a deploy.
//
//  LocalInventoryStore keeps that overlay in the browser. It is real
//  enough to run a shift and to train on, but it does NOT reach the
//  storefront: those pages are prerendered at build time. Point
//  NEXT_PUBLIC_INVENTORY_API at a service and ApiInventoryStore makes the
//  same UI authoritative for everyone.
// ─────────────────────────────────────────────────────────────

import { products as catalog, type Product } from "@/lib/products";
import type { TaxClass } from "@/lib/tax";
import { authHeaders } from "./auth";

/** Fields the shop may change without a deploy. */
export type ItemPatch = Partial<
  Pick<Product, "name" | "price" | "unit" | "stock" | "taxClass" | "cuttable" | "badge" | "description">
>;

export type InventoryState = {
  /** edits layered over catalog items, keyed by product id */
  patches: Record<string, ItemPatch>;
  /** items created in the counter app */
  added: Product[];
  /** catalog items withdrawn from sale */
  hidden: string[];
};

export const EMPTY_INVENTORY: InventoryState = { patches: {}, added: [], hidden: [] };

export interface InventoryStore {
  load(): Promise<InventoryState>;
  save(state: InventoryState): Promise<void>;
}

const KEY = "katy-bazaar-inventory";

export class LocalInventoryStore implements InventoryStore {
  async load(): Promise<InventoryState> {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return EMPTY_INVENTORY;
      const parsed = JSON.parse(raw) as Partial<InventoryState>;
      return {
        patches: parsed.patches ?? {},
        added: Array.isArray(parsed.added) ? parsed.added : [],
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      };
    } catch {
      return EMPTY_INVENTORY;
    }
  }
  async save(state: InventoryState): Promise<void> {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }
}

export class ApiInventoryStore implements InventoryStore {
  constructor(private base: string) {}
  async load(): Promise<InventoryState> {
    const res = await fetch(this.base, { headers: { Accept: "application/json", ...authHeaders() } });
    if (!res.ok) throw new Error(`Inventory API returned ${res.status}`);
    return (await res.json()) as InventoryState;
  }
  async save(state: InventoryState): Promise<void> {
    const res = await fetch(this.base, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error(`Inventory API returned ${res.status}`);
  }
}

export function getInventoryStore(): InventoryStore {
  const base = process.env.NEXT_PUBLIC_INVENTORY_API;
  return base ? new ApiInventoryStore(base) : new LocalInventoryStore();
}

export const inventoryIsLocalOnly = () => !process.env.NEXT_PUBLIC_INVENTORY_API;

/** The catalog as the shop has actually configured it. */
export function effectiveCatalog(state: InventoryState): Product[] {
  const base = catalog
    .filter((p) => !state.hidden.includes(p.id))
    .map((p) => ({ ...p, ...(state.patches[p.id] ?? {}) }));
  return [...state.added, ...base];
}

/** New items get a stable id that cannot collide with the compiled catalog. */
export function newItemId(state: InventoryState): string {
  const n = state.added.length + 1;
  let id = `x${n}`;
  const taken = new Set([...catalog.map((p) => p.id), ...state.added.map((p) => p.id)]);
  let i = n;
  while (taken.has(id)) id = `x${++i}`;
  return id;
}

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export const TAX_CLASSES: { value: TaxClass; label: string }[] = [
  { value: "exempt", label: "Exempt — unprepared food" },
  { value: "taxable", label: "Taxable — candy, soft drinks, non-food" },
];
