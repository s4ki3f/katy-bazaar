import type { TaxClass } from "./tax";

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  /** background gradient stops for the category tile / product placeholder */
  hue: [string, string];
  /** slug of a product photo used as the aisle tile image */
  heroSlug: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string; // category slug
  price: number;
  unit: string; // e.g. "per lb", "each", "2 lb bag"
  oldPrice?: number;
  badge?: "Sale" | "New" | "Popular" | "Fresh";
  halal?: boolean;
  rating: number; // 0-5
  reviews: number;
  stock: number;
  description: string;
  /**
   * Texas sales-tax classification. Unprepared food for home
   * consumption is exempt; candy, soft drinks, prepared food and
   * non-food items are taxable. See src/lib/tax.ts.
   */
  taxClass: TaxClass;
  /** true when the classification is genuinely arguable and needs the store's CPA to confirm */
  taxReview?: boolean;
  /** why this SKU was classified the way it was */
  taxNote?: string;
  /** butcher can cut this to order — surfaces a per-line cut instruction in the cart */
  cuttable?: boolean;
};

/** Sold by weight — quantity is pounds and the total is an estimate until weighed. */
export function isWeighed(p: Product): boolean {
  return p.unit.trim().toLowerCase() === "per lb";
}

export const categories: Category[] = [
  { slug: "halal-meat", name: "Halal Meat", blurb: "Beef, lamb, goat & chicken cut fresh daily", hue: ["#ef4444", "#b91c1c"] , heroSlug: "goat-bone-in" },
  { slug: "poultry", name: "Poultry & Eggs", blurb: "Whole, cuts, marinated & farm eggs", hue: ["#f59e0b", "#d97706"] , heroSlug: "whole-chicken" },
  { slug: "rice-lentils", name: "Rice & Lentils", blurb: "Basmati, sella, daal & flour", hue: ["#84cc16", "#4d7c0f"] , heroSlug: "basmati-rice-10lb" },
  { slug: "spices-masala", name: "Spices & Masala", blurb: "Whole spices, blends & pastes", hue: ["#f97316", "#c2410c"] , heroSlug: "red-chili-powder" },
  { slug: "produce", name: "Fresh Produce", blurb: "Vegetables, herbs & fruit", hue: ["#10b981", "#047857"] , heroSlug: "roma-tomatoes" },
  { slug: "frozen-ready", name: "Frozen & Ready", blurb: "Parathas, samosas & frozen goods", hue: ["#06b6d4", "#0e7490"] , heroSlug: "frozen-samosa" },
  { slug: "snacks-sweets", name: "Snacks & Sweets", blurb: "Mithai, biscuits & namkeen", hue: ["#ec4899", "#be185d"] , heroSlug: "gulab-jamun-tin" },
  { slug: "beverages", name: "Beverages", blurb: "Tea, lassi, juices & soft drinks", hue: ["#8b5cf6", "#6d28d9"] , heroSlug: "mango-lassi" },
];

export const products: Product[] = [
  // ── Halal Meat ──
  { id: "m1", slug: "beef-boneless-cubes", name: "Boneless Beef Cubes", category: "halal-meat", price: 6.99, unit: "per lb", badge: "Popular", halal: true, rating: 4.8, reviews: 214, stock: 40, description: "Lean boneless beef cut into stew-ready cubes. Ideal for curries, kebabs and nihari.", taxClass: "exempt", cuttable: true, },
  { id: "m2", slug: "beef-ground-lean", name: "Fresh Ground Beef (Lean)", category: "halal-meat", price: 5.49, unit: "per lb", halal: true, rating: 4.7, reviews: 176, stock: 55, description: "85/15 lean ground beef, ground in-house daily. Great for keema, koftas and burgers.", taxClass: "exempt", cuttable: true, },
  { id: "m3", slug: "goat-bone-in", name: "Goat Meat (Bone-In)", category: "halal-meat", price: 9.49, unit: "per lb", badge: "Fresh", halal: true, rating: 4.9, reviews: 132, stock: 25, description: "Young goat, bone-in and cut for curry. Tender, flavorful and always fresh.", taxClass: "exempt", cuttable: true, },
  { id: "m4", slug: "lamb-chops", name: "Lamb Loin Chops", category: "halal-meat", price: 12.99, unit: "per lb", oldPrice: 14.99, badge: "Sale", halal: true, rating: 4.8, reviews: 98, stock: 18, description: "Thick-cut lamb loin chops, perfect for the grill or tawa.", taxClass: "exempt", cuttable: true, },
  { id: "m5", slug: "beef-shank", name: "Beef Shank (Bone-In)", category: "halal-meat", price: 5.99, unit: "per lb", halal: true, rating: 4.6, reviews: 74, stock: 30, description: "Cross-cut beef shank with marrow — the classic base for paya and nihari.", taxClass: "exempt", cuttable: true, },
  { id: "m6", slug: "beef-liver", name: "Fresh Beef Liver", category: "halal-meat", price: 4.49, unit: "per lb", halal: true, rating: 4.5, reviews: 41, stock: 22, description: "Cleaned and sliced fresh beef liver. Rich and iron-packed for kaleji masala.", taxClass: "exempt", cuttable: true, },

  // ── Poultry ──
  { id: "p1", slug: "whole-chicken", name: "Whole Halal Chicken", category: "poultry", price: 2.49, unit: "per lb", badge: "Popular", halal: true, rating: 4.8, reviews: 305, stock: 60, description: "Farm-fresh whole chicken, hand-slaughtered zabihah. Cleaned and ready to cook.", taxClass: "exempt", cuttable: true, },
  { id: "p2", slug: "chicken-boneless-breast", name: "Boneless Chicken Breast", category: "poultry", price: 3.99, unit: "per lb", halal: true, rating: 4.7, reviews: 188, stock: 48, description: "Trimmed boneless, skinless chicken breast. Lean protein for tikka and curries.", taxClass: "exempt", cuttable: true, },
  { id: "p3", slug: "chicken-drumsticks", name: "Chicken Drumsticks", category: "poultry", price: 2.29, unit: "per lb", badge: "Sale", oldPrice: 2.99, halal: true, rating: 4.6, reviews: 120, stock: 52, description: "Juicy skin-on drumsticks — perfect for roast, fry or biryani.", taxClass: "exempt", cuttable: true, },
  { id: "p4", slug: "marinated-tikka", name: "Chicken Tikka (Marinated)", category: "poultry", price: 5.99, unit: "per lb", badge: "New", halal: true, rating: 4.9, reviews: 63, stock: 20, description: "House-marinated boneless chicken tikka in our signature spice blend. Grill-ready.", taxClass: "exempt", taxNote: "Raw marinated meat, sold cold and requiring cooking — still unprepared food. Would become taxable if sold hot or ready-to-eat.", cuttable: true, },
  { id: "p5", slug: "farm-eggs", name: "Farm Eggs (Dozen)", category: "poultry", price: 3.49, unit: "per dozen", halal: true, rating: 4.7, reviews: 210, stock: 80, description: "Grade-A large brown eggs from local farms.", taxClass: "exempt", },

  // ── Rice & Lentils ──
  { id: "r1", slug: "basmati-rice-10lb", name: "Premium Basmati Rice", category: "rice-lentils", price: 18.99, unit: "10 lb bag", badge: "Popular", rating: 4.9, reviews: 402, stock: 35, description: "Extra-long aged basmati grains that stay fluffy and separate. The biryani standard.", taxClass: "exempt", },
  { id: "r2", slug: "sella-basmati-10lb", name: "Sella (Parboiled) Basmati", category: "rice-lentils", price: 17.49, unit: "10 lb bag", rating: 4.7, reviews: 156, stock: 28, description: "Golden sella basmati — firm grains ideal for biryani and pulao.", taxClass: "exempt", },
  { id: "r3", slug: "masoor-daal", name: "Red Masoor Daal", category: "rice-lentils", price: 4.29, unit: "2 lb bag", rating: 4.6, reviews: 88, stock: 60, description: "Split red lentils that cook quickly into a creamy, comforting daal.", taxClass: "exempt", },
  { id: "r4", slug: "chana-daal", name: "Chana Daal", category: "rice-lentils", price: 4.79, unit: "2 lb bag", rating: 4.6, reviews: 72, stock: 55, description: "Split Bengal gram — nutty and hearty for daal, halwa and snacks.", taxClass: "exempt", },
  { id: "r5", slug: "chakki-atta-20lb", name: "Chakki Whole Wheat Atta", category: "rice-lentils", price: 12.99, unit: "20 lb bag", badge: "Fresh", rating: 4.8, reviews: 240, stock: 40, description: "Stone-ground whole wheat flour for soft, fresh rotis and parathas.", taxClass: "exempt", },

  // ── Spices & Masala ──
  { id: "s1", slug: "turmeric-powder", name: "Turmeric Powder", category: "spices-masala", price: 3.49, unit: "7 oz", rating: 4.7, reviews: 130, stock: 90, description: "Vibrant, aromatic ground turmeric — an everyday kitchen essential.", taxClass: "exempt", },
  { id: "s2", slug: "red-chili-powder", name: "Kashmiri Red Chili Powder", category: "spices-masala", price: 3.99, unit: "7 oz", badge: "Popular", rating: 4.8, reviews: 175, stock: 85, description: "Deep-red, mild-heat chili powder that brings color and warmth.", taxClass: "exempt", },
  { id: "s3", slug: "garam-masala", name: "Garam Masala Blend", category: "spices-masala", price: 4.49, unit: "3.5 oz", rating: 4.9, reviews: 210, stock: 70, description: "House blend of freshly ground warming spices to finish any curry.", taxClass: "exempt", },
  { id: "s4", slug: "cumin-seeds", name: "Whole Cumin Seeds", category: "spices-masala", price: 3.29, unit: "7 oz", rating: 4.6, reviews: 64, stock: 75, description: "Fragrant whole zeera for tempering, rice and spice blends.", taxClass: "exempt", },
  { id: "s5", slug: "ginger-garlic-paste", name: "Ginger-Garlic Paste", category: "spices-masala", price: 2.99, unit: "26 oz jar", badge: "New", rating: 4.5, reviews: 52, stock: 65, description: "Ready-to-use ginger and garlic paste — the shortcut to every base masala.", taxClass: "exempt", },

  // ── Produce ──
  { id: "v1", slug: "yellow-onions-3lb", name: "Yellow Onions", category: "produce", price: 2.49, unit: "3 lb bag", rating: 4.5, reviews: 60, stock: 100, description: "Firm, fresh yellow onions — the backbone of every curry.", taxClass: "exempt", },
  { id: "v2", slug: "roma-tomatoes", name: "Roma Tomatoes", category: "produce", price: 1.29, unit: "per lb", badge: "Fresh", rating: 4.4, reviews: 40, stock: 120, description: "Ripe roma tomatoes, great for gravies, salan and salad.", taxClass: "exempt", },
  { id: "v3", slug: "cilantro-bunch", name: "Fresh Cilantro", category: "produce", price: 0.99, unit: "per bunch", rating: 4.6, reviews: 55, stock: 90, description: "Crisp, aromatic cilantro picked fresh — dhania for garnish and chutney.", taxClass: "exempt", },
  { id: "v4", slug: "green-chilies", name: "Green Chilies", category: "produce", price: 2.99, unit: "per lb", rating: 4.5, reviews: 33, stock: 70, description: "Fresh hot green chilies for that essential kick.", taxClass: "exempt", },
  { id: "v5", slug: "ginger-root", name: "Fresh Ginger Root", category: "produce", price: 2.79, unit: "per lb", rating: 4.6, reviews: 28, stock: 65, description: "Plump, juicy ginger root — peel, crush and cook.", taxClass: "exempt", },

  // ── Frozen & Ready ──
  { id: "f1", slug: "frozen-paratha", name: "Frozen Laccha Paratha (5 pk)", category: "frozen-ready", price: 4.99, unit: "5 pack", badge: "Popular", rating: 4.8, reviews: 190, stock: 45, description: "Flaky, layered parathas — straight from freezer to tawa in minutes.", taxClass: "exempt", },
  { id: "f2", slug: "frozen-samosa", name: "Frozen Vegetable Samosa (20 pk)", category: "frozen-ready", price: 7.49, unit: "20 pack", rating: 4.7, reviews: 110, stock: 38, description: "Crispy potato-and-pea samosas ready to fry for tea-time and iftar.", taxClass: "exempt", taxNote: "Frozen and requires cooking — not 'ready to eat', so exempt.", },
  { id: "f3", slug: "frozen-seekh-kebab", name: "Chicken Seekh Kebab (Frozen)", category: "frozen-ready", price: 8.99, unit: "12 pack", badge: "New", halal: true, rating: 4.8, reviews: 76, stock: 30, description: "Halal chicken seekh kebabs — grill or pan-fry from frozen.", taxClass: "exempt", taxNote: "Frozen and requires cooking — exempt.", },
  { id: "f4", slug: "frozen-roti", name: "Frozen Tandoori Roti (10 pk)", category: "frozen-ready", price: 3.99, unit: "10 pack", rating: 4.5, reviews: 88, stock: 50, description: "Soft tandoori rotis to heat and serve in seconds.", taxClass: "exempt", },

  // ── Snacks & Sweets ──
  { id: "n1", slug: "gulab-jamun-tin", name: "Gulab Jamun (Tin)", category: "snacks-sweets", price: 6.99, unit: "1 kg tin", badge: "Popular", rating: 4.8, reviews: 145, stock: 40, description: "Soft, syrup-soaked gulab jamun — dessert sorted.", taxClass: "taxable", taxReview: true, taxNote: "Milk-solid dumplings in sugar syrup. Arguably 'candy' (taxable) or a canned food product (exempt). Classified taxable as the conservative reading — CONFIRM WITH CPA.", },
  { id: "n2", slug: "mixed-namkeen", name: "Mixed Namkeen", category: "snacks-sweets", price: 4.49, unit: "14 oz", rating: 4.6, reviews: 92, stock: 60, description: "Crunchy savory mix of sev, boondi and nuts for chai time.", taxClass: "exempt", },
  { id: "n3", slug: "tea-biscuits", name: "Cardamom Tea Biscuits", category: "snacks-sweets", price: 3.29, unit: "12 oz", rating: 4.5, reviews: 70, stock: 75, description: "Lightly sweet cardamom biscuits made for dunking.", taxClass: "exempt", taxNote: "Bakery item — exempt in Texas provided it is not heated or sold with utensils.", },

  // ── Beverages ──
  { id: "b1", slug: "black-tea-loose", name: "Loose-Leaf Black Tea", category: "beverages", price: 8.99, unit: "2 lb", badge: "Popular", rating: 4.9, reviews: 260, stock: 55, description: "Strong, malty black tea leaves for the perfect cup of doodh patti.", taxClass: "exempt", },
  { id: "b2", slug: "mango-lassi", name: "Mango Lassi (6 pk)", category: "beverages", price: 5.99, unit: "6 pack", badge: "New", rating: 4.7, reviews: 84, stock: 48, description: "Creamy, sweet mango lassi — chilled and ready to drink.", taxClass: "exempt", taxNote: "Milk-based drink — milk and milk products are exempt in Texas, so not treated as a soft drink.", },
  { id: "b3", slug: "rooh-afza", name: "Rooh Afza Syrup", category: "beverages", price: 6.49, unit: "26 oz", rating: 4.6, reviews: 130, stock: 42, description: "The classic rose-summer syrup for sharbat and falooda.", taxClass: "taxable", taxReview: true, taxNote: "Sweetened beverage concentrate. Texas taxes soft drinks; a syrup sold as a drink base is likely taxable. Classified taxable as the conservative reading — CONFIRM WITH CPA.", },
];

// ── Helpers ──
export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}
export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
export function productsByCategory(slug: string) {
  return products.filter((p) => p.category === slug);
}
export function categoryHue(slug: string): [string, string] {
  return getCategory(slug)?.hue ?? ["#059669", "#047857"];
}
