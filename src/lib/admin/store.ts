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
};

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
    if (!res.ok) throw new Error(`Orders API returned ${res.status}`);
  }
}

/**
 * The counter app is excluded from the public build unless this is set.
 * A static export cannot authenticate anyone, so shipping the order UI to
 * GitHub Pages would expose customer names and phone numbers to anyone
 * with the URL. Real deployments set NEXT_PUBLIC_ENABLE_ADMIN=true on a
 * host that can put a login in front of it.
 */
export const adminEnabled = () => process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true";

export function getOrderStore(): OrderStore {
  const base = process.env.NEXT_PUBLIC_ORDERS_API;
  return base ? new ApiOrderStore(base) : new LocalOrderStore();
}

export const isLocalOnly = () => !process.env.NEXT_PUBLIC_ORDERS_API;
