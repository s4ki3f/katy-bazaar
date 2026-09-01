"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { CartIcon, CheckIcon } from "./icons";

export function QuickAdd({ id, label = "Add" }: { id: string; label?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handle() {
    add(id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={`Add to cart`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        added
          ? "bg-accent text-white"
          : "bg-primary text-on-primary hover:bg-primary-dark"
      }`}
    >
      {added ? <CheckIcon width={16} height={16} /> : <CartIcon width={16} height={16} />}
      {added ? "Added" : label}
    </button>
  );
}
