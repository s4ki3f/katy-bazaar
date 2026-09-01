"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartIcon, CheckIcon, MinusIcon, PlusIcon } from "./icons";

export function AddToCart({ id, stock }: { id: string; stock: number }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const max = Math.max(1, Math.min(stock, 20));

  function handle() {
    add(id, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-border bg-surface">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-l-full hover:bg-muted disabled:opacity-40 cursor-pointer"
            aria-label="Decrease quantity"
            disabled={qty <= 1}
          >
            <MinusIcon width={18} height={18} />
          </button>
          <span className="w-10 text-center font-display font-semibold" aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-r-full hover:bg-muted disabled:opacity-40 cursor-pointer"
            aria-label="Increase quantity"
            disabled={qty >= max}
          >
            <PlusIcon width={18} height={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={handle}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            added ? "bg-accent text-white" : "bg-primary text-on-primary hover:bg-primary-dark"
          }`}
        >
          {added ? <CheckIcon width={20} height={20} /> : <CartIcon width={20} height={20} />}
          {added ? "Added to cart" : "Add to cart"}
        </button>
      </div>

      {added && (
        <Link href="/cart" className="text-center text-sm font-semibold text-primary hover:underline">
          View cart →
        </Link>
      )}
    </div>
  );
}
