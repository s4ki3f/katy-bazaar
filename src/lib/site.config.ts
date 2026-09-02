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
    whatsapp: "https://wa.me/1281000000",
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

/** True while site.config still holds the scaffolded placeholder values. */
export const contactIsPlaceholder =
  site.phone.includes("000-0000") || site.address.line1.toLowerCase().includes("placeholder");


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
