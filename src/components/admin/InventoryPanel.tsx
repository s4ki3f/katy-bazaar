"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { categories } from "@/lib/products";
import { money } from "@/lib/format";
import type { Role } from "@/lib/admin/auth";
import {
  getInventoryStore, inventoryIsLocalOnly, effectiveCatalog, newItemId, slugify,
  EMPTY_INVENTORY, TAX_CLASSES, type InventoryState,
} from "@/lib/admin/inventory";

const field =
  "w-full rounded-lg border border-field bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export function InventoryPanel({ role }: { role: Role | null }) {
  const store = useMemo(() => getInventoryStore(), []);
  const [state, setState] = useState<InventoryState>(EMPTY_INVENTORY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [adding, setAdding] = useState(false);

  // staff keep the shelves honest; only admin changes what a thing is or costs
  const canEditAll = role !== "staff";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await store.load();
        if (!alive) return;
        setState(s);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load inventory.");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [store]);

  const persist = useCallback(async (next: InventoryState) => {
    setState(next);
    try { await store.save(next); } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }, [store]);

  const items = effectiveCatalog(state).filter((p) => {
    const matchesCat = cat === "all" || p.category === cat;
    const matchesQ = !q || p.name.toLowerCase().includes(q.toLowerCase());
    return matchesCat && matchesQ;
  });

  function patch(id: string, key: string, value: unknown) {
    void persist({ ...state, patches: { ...state.patches, [id]: { ...state.patches[id], [key]: value } } });
  }
  function isAdded(id: string) { return state.added.some((a) => a.id === id); }

  function patchAdded(id: string, key: string, value: unknown) {
    void persist({ ...state, added: state.added.map((a) => (a.id === id ? { ...a, [key]: value } : a)) });
  }
  function setField(id: string, key: string, value: unknown) {
    if (isAdded(id)) patchAdded(id, key, value);
    else patch(id, key, value);
  }

  function withdraw(id: string) {
    if (isAdded(id)) {
      void persist({ ...state, added: state.added.filter((a) => a.id !== id) });
    } else {
      void persist({ ...state, hidden: [...state.hidden, id] });
    }
  }
  function restoreAll() {
    void persist(EMPTY_INVENTORY);
  }

  function addItem(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const id = newItemId(state);
    void persist({
      ...state,
      added: [
        {
          id,
          slug: slugify(name) || id,
          name,
          category: String(form.get("category") ?? categories[0].slug),
          price: Number(form.get("price") ?? 0),
          unit: String(form.get("unit") ?? "each"),
          rating: 0,
          reviews: 0,
          stock: Number(form.get("stock") ?? 0),
          description: String(form.get("description") ?? ""),
          taxClass: (String(form.get("taxClass") ?? "exempt") as "exempt" | "taxable"),
          cuttable: form.get("cuttable") === "on",
          halal: form.get("halal") === "on",
        },
        ...state.added,
      ],
    });
    setAdding(false);
  }

  if (!loaded) return <p className="mt-8 text-muted-foreground">Loading inventory…</p>;

  const dirty = Object.keys(state.patches).length + state.added.length + state.hidden.length;

  return (
    <div className="mt-6">
      {inventoryIsLocalOnly() && (
        <p className="mb-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Changes are saved in this browser only. The storefront is prerendered at build time, so it
          will not see them until <code className="font-mono">NEXT_PUBLIC_INVENTORY_API</code> points
          at a service both sides read.
        </p>
      )}
      {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search items…" aria-label="Search inventory"
          className={`${field} max-w-56`}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className={`${field} max-w-52`}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <span className="text-sm text-muted-foreground tabular-nums">{items.length} items</span>
        {canEditAll && (
          <button onClick={() => setAdding((v) => !v)} aria-expanded={adding}
            className="ml-auto rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
            {adding ? "Cancel" : "Add item"}
          </button>
        )}
        {canEditAll && dirty > 0 && (
          <button onClick={restoreAll}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
            Reset all ({dirty})
          </button>
        )}
      </div>

      {adding && canEditAll && (
        <form
          onSubmit={(e) => { e.preventDefault(); addItem(new FormData(e.currentTarget)); }}
          className="mt-4 rounded-card border border-border bg-surface p-5"
        >
          <h3 className="font-display font-bold">New item</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium">Name</span>
              <input name="name" required className={field} placeholder="Mutton Ribs (Bone-In)" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium">Category</span>
              <select name="category" className={field}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium">Price</span>
              <input name="price" type="number" step="0.01" min="0" required className={field} placeholder="9.99" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium">Unit</span>
              <input name="unit" className={field} placeholder="per lb" defaultValue="per lb" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium">Stock</span>
              <input name="stock" type="number" min="0" className={field} defaultValue={0} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium">Sales tax</span>
              <select name="taxClass" className={field}>{TAX_CLASSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
            <label className="block sm:col-span-3"><span className="mb-1 block text-xs font-medium">Description</span>
              <input name="description" className={field} placeholder="Cut for curry, cleaned and trimmed." /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cuttable" defaultChecked className="h-4 w-4" /> Butcher can cut to order</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="halal" defaultChecked className="h-4 w-4" /> Zabihah halal</label>
          </div>
          <button type="submit" className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dark cursor-pointer">
            Add to inventory
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-3 font-semibold">Item</th>
              <th className="p-3 font-semibold">Price</th>
              <th className="p-3 font-semibold">Unit</th>
              <th className="p-3 font-semibold">Stock</th>
              <th className="p-3 font-semibold">Tax</th>
              <th className="p-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const edited = Boolean(state.patches[p.id]) || isAdded(p.id);
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <span className="font-display font-semibold">{p.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {isAdded(p.id) && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">new</span>}
                      {!isAdded(p.id) && edited && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">edited</span>}
                      {p.stock === 0 && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">out of stock</span>}
                      {p.cuttable && <span className="text-[10px] text-muted-foreground">cut to order</span>}
                    </span>
                  </td>
                  <td className="p-3">
                    {canEditAll ? (
                      <input type="number" step="0.01" min="0" defaultValue={p.price} aria-label={`Price for ${p.name}`}
                        onBlur={(e) => setField(p.id, "price", Number(e.target.value))}
                        className={`${field} w-24 tabular-nums`} />
                    ) : <span className="tabular-nums">{money(p.price)}</span>}
                  </td>
                  <td className="p-3">
                    {canEditAll ? (
                      <input defaultValue={p.unit} aria-label={`Unit for ${p.name}`}
                        onBlur={(e) => setField(p.id, "unit", e.target.value)} className={`${field} w-28`} />
                    ) : <span className="text-muted-foreground">{p.unit}</span>}
                  </td>
                  <td className="p-3">
                    <input type="number" min="0" defaultValue={p.stock} aria-label={`Stock for ${p.name}`}
                      onBlur={(e) => setField(p.id, "stock", Number(e.target.value))}
                      className={`${field} w-20 tabular-nums`} />
                  </td>
                  <td className="p-3">
                    {canEditAll ? (
                      <select defaultValue={p.taxClass} aria-label={`Tax class for ${p.name}`}
                        onChange={(e) => setField(p.id, "taxClass", e.target.value)} className={`${field} w-28`}>
                        <option value="exempt">Exempt</option>
                        <option value="taxable">Taxable</option>
                      </select>
                    ) : (
                      <span className="text-muted-foreground">{p.taxClass === "taxable" ? "Taxable" : "Exempt"}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {canEditAll && (
                      <button onClick={() => withdraw(p.id)}
                        className="text-xs font-semibold text-muted-foreground underline hover:text-destructive cursor-pointer">
                        {isAdded(p.id) ? "Delete" : "Withdraw"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!canEditAll && (
        <p className="mt-3 text-xs text-muted-foreground">
          Signed in as staff — you can correct stock counts. Prices, units, tax class and adding or
          withdrawing items are admin-only.
        </p>
      )}
    </div>
  );
}
