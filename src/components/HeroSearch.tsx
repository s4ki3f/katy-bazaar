"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

/** Hero search — uses the router so it respects Next's basePath on GitHub Pages. */
export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  }

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-md items-center gap-2 rounded-full bg-white p-1.5 shadow-lift">
      <SearchIcon className="ml-3 text-muted-foreground" width={20} height={20} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Search meat, rice, spices…"
        aria-label="Search products"
        className="min-w-0 flex-1 bg-transparent px-1 py-2 text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark cursor-pointer">
        Search
      </button>
    </form>
  );
}
