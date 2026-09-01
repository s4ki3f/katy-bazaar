"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { products, type Product } from "@/lib/products";

export type CartItem = { id: string; qty: number };

type State = { items: CartItem[]; ready: boolean };
type Action =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; id: string; qty?: number }
  | { type: "remove"; id: string }
  | { type: "setQty"; id: string; qty: number }
  | { type: "clear" };

const STORAGE_KEY = "katy-bazaar-cart";

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { items: action.items, ready: true };
    case "add": {
      const qty = action.qty ?? 1;
      const existing = state.items.find((i) => i.id === action.id);
      const items = existing
        ? state.items.map((i) => (i.id === action.id ? { ...i, qty: i.qty + qty } : i))
        : [...state.items, { id: action.id, qty }];
      return { ...state, items };
    }
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "setQty": {
      if (action.qty <= 0) return { ...state, items: state.items.filter((i) => i.id !== action.id) };
      return { ...state, items: state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)) };
    }
    case "clear":
      return { ...state, items: [] };
    default:
      return state;
  }
}

export type CartLine = { product: Product; qty: number; lineTotal: number };

type CartContextValue = {
  ready: boolean;
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (id: string, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], ready: false });

  // hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items = raw ? (JSON.parse(raw) as CartItem[]) : [];
      dispatch({ type: "hydrate", items: Array.isArray(items) ? items : [] });
    } catch {
      dispatch({ type: "hydrate", items: [] });
    }
  }, []);

  // persist
  useEffect(() => {
    if (!state.ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [state.items, state.ready]);

  const value = useMemo<CartContextValue>(() => {
    const lines: CartLine[] = state.items
      .map((i) => {
        const product = products.find((p) => p.id === i.id);
        if (!product) return null;
        return { product, qty: i.qty, lineTotal: product.price * i.qty };
      })
      .filter(Boolean) as CartLine[];

    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);

    return {
      ready: state.ready,
      lines,
      count,
      subtotal,
      add: (id, qty) => dispatch({ type: "add", id, qty }),
      remove: (id) => dispatch({ type: "remove", id }),
      setQty: (id, qty) => dispatch({ type: "setQty", id, qty }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state.items, state.ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
