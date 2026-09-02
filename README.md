# Katy Bazaar & Halal Meat — E-commerce Storefront

A modern e-commerce storefront for **Katy Bazaar & Halal Meat** (Katy, TX) — fresh
zabihah halal meat and everyday South Asian / Middle Eastern groceries.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4**.

## Features

- **Home** — hero with product search, value props, category grid, "meat counter"
  section, fresh-this-week products, testimonials, CTA.
- **Shop** (`/shop`) — filter by category, live search, sort (popularity / price / rating).
  Category is reflected in the URL (`/shop?category=halal-meat`) so it's shareable.
- **Product pages** (`/product/[slug]`) — statically generated for every product,
  with quantity selector, badges, related items, and SEO metadata.
- **Cart** (`/cart`) — persisted in `localStorage`, quantity editing, tax total,
  free in-store pickup.
- **Checkout** (`/checkout`) — in-store pickup only (pickup location + preferred
  time), cash or card, order confirmation. _Demo only — no real payment is processed._
- **About** & **Contact** pages.
- Fully responsive, keyboard-accessible, honors `prefers-reduced-motion`.

## Getting started

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## ⚠️ Replace the placeholders

Business details are **placeholders** pending the real info from the Facebook page.
Edit them in one place:

- `src/lib/site.config.ts` — name, **address, phone, email, hours, socials**,
  tax rate.
- `src/lib/products.ts` — the mock product catalog and categories.

## Product images

Product "photos" are self-contained SVG placeholders (`src/components/ProductThumb.tsx`)
using the category color + initials, so the store looks complete with zero external
image dependencies. To use real photos: drop files in `/public` and swap `ProductThumb`
for `next/image` keyed by product slug.

## Branding

- `public/logo.svg` — horizontal logo lockup (emblem + wordmark).
- `public/mark.svg` — standalone emblem (used as favicon).
- Palette & type live as tokens in `src/app/globals.css`
  (primary `#059669`, accent `#D97706`; Rubik + Nunito Sans).
- Design system reference: `design-system/katy-bazaar/MASTER.md`.

## Structure

```
src/
  app/            # routes: /, /shop, /product/[slug], /cart, /checkout, /about, /contact
  components/     # Header, Footer, ProductCard, cart controls, icons, etc.
  context/        # CartContext (localStorage-backed)
  lib/            # site.config.ts, products.ts, format.ts
```

## Counter (staff) app

The order screens at `/admin` are excluded from the public build. A static
export cannot authenticate anyone, so publishing them would expose customer
names and phone numbers to anyone with the URL.

```bash
npm run dev:counter      # storefront + /admin locally
npm run build:counter    # the staff deployment
npm run build            # public build — no admin surface at all
```

### Development sign-in

With no auth server configured, two local accounts are active **in dev only**:

| Email | Password | Role |
|---|---|---|
| `admin@dev.com` | `admin` | admin — all controls |
| `staff@dev.com` | `staff` | staff — picking only |

`next build` removes this branch entirely; a production bundle contains
neither the check nor the credentials. For a real deployment set
`NEXT_PUBLIC_ADMIN_AUTH_API` to a server that verifies credentials, or — the
right answer for a single shop — put host-level password protection
(Cloudflare Access, Netlify, Vercel) in front of `/admin` and skip the auth
server. See `src/lib/admin/auth.ts`.

## Where do orders go?

Checkout will not confirm an order until it has somewhere to send it. That
is deliberate — the alternative is telling a customer their order was
received when nothing received it.

Pick one:

**1. WhatsApp — no server, works today.** Put the store's real number in
`src/lib/site.config.ts` under `socials.whatsapp`, in `wa.me` form:

```ts
whatsapp: "https://wa.me/12815551234",   // country code, digits only
```

Placing an order then opens WhatsApp with the full order pre-filled —
pickup ID, every line, cut instructions, substitution preferences, total.

**2. A hosted endpoint — still no server of your own.** Set
`NEXT_PUBLIC_ORDER_ENDPOINT` to anything that accepts a JSON POST:
Formspree, Web3Forms, a Zapier/Make catch hook, a Google Apps Script web
app. This takes precedence over WhatsApp when set.

**3. Your own API.** Same variable, your URL. Pair it with
`NEXT_PUBLIC_ORDERS_API` so the counter app reads the same orders and the
shop is no longer limited to one browser.

See `.env.example` for every variable.
