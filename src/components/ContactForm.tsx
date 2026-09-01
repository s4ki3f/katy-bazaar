"use client";

import { useState } from "react";
import { CheckIcon } from "./icons";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const inputCls =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring";

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-border bg-surface p-10 text-center shadow-soft">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
          <CheckIcon width={30} height={30} />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold">Message sent!</h2>
        <p className="mt-1 text-sm text-muted-foreground">Thanks for reaching out — we&apos;ll reply shortly. (Demo form — nothing was sent.)</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true); }}
      className="rounded-card border border-border bg-surface p-6 shadow-soft"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">Name</span>
          <input required autoComplete="name" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">Phone</span>
          <input type="tel" autoComplete="tel" className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">Email</span>
          <input required type="email" autoComplete="email" className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">Message</span>
          <textarea required rows={5} className={inputCls} placeholder="How can we help?" />
        </label>
      </div>
      <button type="submit" className="mt-5 rounded-full bg-primary px-8 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-dark cursor-pointer">
        Send message
      </button>
    </form>
  );
}
