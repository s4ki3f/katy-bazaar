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
  taxRate: 0.0825, // 8.25% (Katy, TX placeholder)
} as const;

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
