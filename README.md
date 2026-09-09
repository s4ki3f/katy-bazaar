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

## Deploying to Vercel

This is a dynamic, server-rendered Next.js app. It was a static export for
GitHub Pages; that is gone, because a static site cannot authenticate
staff, cannot receive an order, and cannot show the shop's own inventory
edits to customers.

```bash
npm i -g vercel
vercel login
vercel link
vercel               # preview
vercel --prod        # production
```

### Environment variables

Project → Settings → Environment Variables. Nothing here is
`NEXT_PUBLIC_`, so none of it reaches the browser bundle.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_ENABLE_ADMIN` | `true` to include the counter app |
| `NEXT_PUBLIC_ADMIN_AUTH_API` | `/api/auth` |
| `COUNTER_SESSION_SECRET` | signs session tokens — `openssl rand -base64 32` |
| `COUNTER_ADMIN_EMAIL` / `COUNTER_ADMIN_PASSWORD` | admin account |
| `COUNTER_STAFF_EMAIL` / `COUNTER_STAFF_PASSWORD` | staff account |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | datastore — Vercel → Storage → Redis |

Without Redis, development falls back to a JSON file under `.data/` and
**production refuses to write**, returning 503 rather than losing an order
to an ephemeral serverless filesystem.

### What the server bought

| | Static export | Dynamic |
|---|---|---|
| Staff sign-in | credentials in the bundle | checked server-side |
| Orders | WhatsApp hand-off only | received and queued by the app |
| Counter queue | one browser | shared across devices |
| Inventory edits | never reached customers | server-rendered on the storefront |
| Images | unoptimised | optimised |

### API

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth` | — | sign in, returns `{ token, role }` |
| `POST /api/orders` | none | a customer places an order (idempotent by reference) |
| `GET /api/orders` | Bearer | the counter queue |
| `PUT /api/orders/[reference]` | Bearer | update an order while picking |
| `GET /api/inventory` | none | live catalog overlay, read by the storefront |
| `PUT /api/inventory` | Bearer | save catalog edits |

### Protect /admin

Add **Vercel Deployment Protection** in front of the deployment as well as
the login. Two locks on a page holding customer names and phone numbers,
and it costs no code.
