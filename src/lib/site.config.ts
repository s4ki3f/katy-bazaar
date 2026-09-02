// ─────────────────────────────────────────────────────────────
//  KATY BAZAAR & HALAL MEAT — SITE CONFIG
//  ⚠️  PLACEHOLDERS: replace these with the real details from the
//      Facebook page (address, phone, hours, socials) once available.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "Katy Bazaar",
  fullName: "Katy Bazaar & Halal Meat",
  tagline: "Fresh halal meat & everyday groceries — your neighborhood bazaar.",
  description:
    "Zabihah halal meat cut fresh daily, plus South Asian, Middle Eastern & everyday groceries. Serving the Katy community.",

  // TODO: confirm real values
  phone: "(281) 000-0000",
  email: "hello@katybazaar.com",
  address: {
    line1: "0000 Placeholder Blvd",
    line2: "Suite 000",
    city: "Katy",
    state: "TX",
    zip: "77494",
  },

  hours: [
    { day: "Mon – Thu", time: "9:00 AM – 9:00 PM" },
    { day: "Fri", time: "9:00 AM – 1:00 PM · 2:30 PM – 10:00 PM" },
    { day: "Sat – Sun", time: "8:00 AM – 10:00 PM" },
  ],

  socials: {
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",

    /**
     * ⚠️ ORDERS GO NOWHERE UNTIL THIS IS REAL.
     *
     * Replace with the store's actual WhatsApp number in wa.me form —
     * country code, no spaces or symbols. US example:
     *   https://wa.me/12815551234
     *
     * Currently set to 281-555-0100, which is inside the NANP block
     * reserved for fictional use (555-0100 to 555-0199). It is a
     * placeholder, it is detected as one, and a production build treats
     * it as "no destination configured". Note that 555-1234 is NOT in
     * the reserved block and could belong to a real subscriber.
     *
     * With a real number here, placing an order opens WhatsApp with the
     * whole order pre-filled and the shop receives it. That is the
     * zero-infrastructure option and it suits how this customer base
     * already contacts the store.
     *
     * The alternative is NEXT_PUBLIC_ORDER_ENDPOINT (see .env.example),
     * which takes precedence when set. Until one of the two exists,
     * checkout refuses to confirm rather than pretend the order arrived.
     */
    whatsapp: "https://wa.me/12815550100",
  },

  // Storefront settings
  currency: "$",

  /**
   * Combined state + local sales-tax rate for Katy, TX 77494 (6.25% state
   * + 1% city + 1% special district). Applied ONLY to items classified
   * `taxable` in the catalog — see src/lib/tax.ts. Most groceries are
   * exempt in Texas.
   */
  taxRate: 0.0825,

  /**
   * Star ratings are currently seeded demo values. Publishing invented
   * review counts is an FTC problem, so they stay hidden until wired to
   * real reviews. Flip to true once ratings come from actual customers.
   */
  showRatings: false,

  /**
   * TODO: the certifying body behind the "100% Zabihah Halal" claim.
   * Leave null and the certification block stays hidden — better than
   * an unbacked claim.
   */
  halalCertifier: null as null | { name: string; certificateUrl?: string },
} as const;

/**
 * The scaffold shipped a fake phone number and street address. Rendering
 * them is worse than rendering nothing: a customer taps the number and
 * dials a stranger, or drives to an address that does not exist. Until
 * the real values are in, every surface omits them and shows only what is
 * true — the city, state and ZIP.
 */
export const phoneIsPlaceholder = /0{3}-?0{4}|000-0000/.test(site.phone);
export const addressIsPlaceholder =
  site.address.line1.toLowerCase().includes("placeholder") || /^0+\s/.test(site.address.line1);
export const contactIsPlaceholder = phoneIsPlaceholder || addressIsPlaceholder;

/** What is safe to print today: the full address, or just the locality. */
export const addressLines = (): string[] =>
  addressIsPlaceholder
    ? [`${site.address.city}, ${site.address.state} ${site.address.zip}`]
    : [
        `${site.address.line1}${site.address.line2 ? `, ${site.address.line2}` : ""}`,
        `${site.address.city}, ${site.address.state} ${site.address.zip}`,
      ];


/**
 * Specials shown in the scrolling banner. Edit this list — no code change
 * needed. Put the dates in the text; the banner itself runs all week.
 */
export const weekendOffers: { label: string; text: string }[] = [
  { label: "Weekend special", text: "Goat curry cut — $8.99/lb, Fri–Sun only" },
  { label: "Fresh", text: "Whole chicken cleaned & cut free of charge" },
  { label: "Bundle", text: "2 lb keema + 2 lb boti — $32, save $6" },
  { label: "In season", text: "Fresh cilantro & green chilies in every morning" },
  { label: "Weekend special", text: "Lamb loin chops down to $12.99/lb" },
];


export const valueProps = [
  {
    title: "100% Zabihah Halal",
    body: "Every cut is hand-slaughtered and certified zabihah halal.",
    icon: "shield",
  },
  {
    title: "Cut Fresh Daily",
    body: "In-house butcher — beef, lamb, goat & chicken cut to order.",
    icon: "knife",
  },
  {
    title: "Order & Collect",
    body: "Order ahead online and pick up fresh in-store — usually ready within the hour.",
    icon: "clock",
  },
  {
    title: "Groceries You Trust",
    body: "South Asian, Middle Eastern & everyday pantry staples.",
    icon: "basket",
  },
] as const;
