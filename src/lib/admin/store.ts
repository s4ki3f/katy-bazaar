"use client";

// ─────────────────────────────────────────────────────────────
//  COUNTER APP — ORDER STORE
//
//  The storefront is a static export with no server, so there is no
//  shared database yet. This module is the seam:
//
//    • LocalOrderStore  — browser-only, works today, good for training
//      staff and for demoing the flow. Orders do NOT sync between
//      devices.
//    • ApiOrderStore    — reads/writes NEXT_PUBLIC_ORDERS_API. Point it
//      at whatever receives NEXT_PUBLIC_ORDER_ENDPOINT and the counter
//      app becomes real, with no UI changes.
//
//  getOrderStore() picks the API store when the env var is set.
// ─────────────────────────────────────────────────────────────

import type { Order, OrderLine } from "@/lib/order";
import { authHeaders } from "./auth";

export type OrderStatus = "new" | "picking" | "ready" | "collected";

export type PickState = "pending" | "picked" | "unavailable";

export type CounterLine = OrderLine & {
  pick: PickState;
  /** actual weight in lb, entered at the scale — only for per-lb lines */
  actualQty?: number;
  /** what was substituted in, when the shopper allowed it */
  substitutedWith?: string;
};

export type CounterOrder = Omit<Order, "lines"> & {
  status: OrderStatus;
  lines: CounterLine[];
  updatedAt: string;
  /**
   * Which stored revision this document was read at. Sent back on save so the server can refuse an
   * edit built on a snapshot somebody else has already replaced — previously the later save just
   * overwrote the earlier one and stamped a fresh `updatedAt`, so the clobber looked like the
   * newest state.
   */
  version?: number;
};

/** A save refused because the order moved underneath this client, carrying what is actually stored. */
export class OrderConflictError extends Error {
  constructor(readonly current: CounterOrder | null) {
    super("Someone else updated this order while you were working on it.");
    this.name = "OrderConflictError";
  }
}

export interface OrderStore {
  list(): Promise<CounterOrder[]>;
  save(order: CounterOrder): Promise<void>;
}

const KEY = "katy-bazaar-counter-orders";

function toCounterOrder(o: Order): CounterOrder {
  return {
    ...o,
    status: "new",
    updatedAt: o.placedAt,
    lines: o.lines.map((l) => ({ ...l, pick: "pending" as PickState })),
  };
}

export class LocalOrderStore implements OrderStore {
  async list(): Promise<CounterOrder[]> {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as CounterOrder[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  async save(order: CounterOrder): Promise<void> {
    const all = await this.list();
    const next = all.some((o) => o.reference === order.reference)
      ? all.map((o) => (o.reference === order.reference ? order : o))
      : [order, ...all];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  /** Accepts a storefront Order (e.g. posted from checkout) into the queue. */
  async accept(o: Order): Promise<void> {
    await this.save(toCounterOrder(o));
  }
}

export class ApiOrderStore implements OrderStore {
  constructor(private base: string) {}
  async list(): Promise<CounterOrder[]> {
    const res = await fetch(this.base, { headers: { Accept: "application/json", ...authHeaders() } });
    if (!res.ok) throw new Error(`Orders API returned ${res.status}`);
    const data = (await res.json()) as (Order | CounterOrder)[];
    return data.map((o) => ("status" in o ? (o as CounterOrder) : toCounterOrder(o as Order)));
  }
  async save(order: CounterOrder): Promise<void> {
    const res = await fetch(`${this.base}/${encodeURIComponent(order.reference)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(order),
    });
    if (res.ok) return;
    if (res.status === 409) {
      // The server hands back the current record precisely so this client can rebase rather than
      // re-submit over work it never saw.
      const body = (await res.json().catch(() => null)) as { current?: CounterOrder } | null;
      throw new OrderConflictError(body?.current ?? null);
    }
    const detail = (await res.json().then((b: { error?: string }) => b?.error).catch(() => undefined)) as string | undefined;
    throw new Error(detail ?? `Orders API returned ${res.status}`);
  }
}

/**
 * Whether this build includes the counter app.
 *
 * It ships when either is true:
 *   • NEXT_PUBLIC_ENABLE_ADMIN=true — an explicit decision, or
 *   • NEXT_PUBLIC_ADMIN_AUTH_API is set — a sign-in server exists, so the
 *     order screens are protected and there is no reason to withhold them.
 *
 * A build with neither has no way to authenticate anyone, and the order
 * screens hold customer names and phone numbers, so they are left out
 * rather than published unprotected.
 */
export const adminEnabled = () =>
  process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true" ||
  Boolean(process.env.NEXT_PUBLIC_ADMIN_AUTH_API);

export function getOrderStore(): OrderStore {
  // The app now ships with its own API, so the server is the default and
  // every device sees the same queue. Override only to point elsewhere.
  const base = process.env.NEXT_PUBLIC_ORDERS_API ?? "/api/orders";
  return new ApiOrderStore(base);
}

/** Kept for the UI copy; the API is always used now. */
export const isLocalOnly = () => false;
