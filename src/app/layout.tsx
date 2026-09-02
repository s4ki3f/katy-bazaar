import type { Metadata } from "next";
import { Rubik, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { MotionProvider } from "@/components/MotionProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/site.config";
import { asset } from "@/lib/asset";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});
const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.fullName} — Fresh Halal Meat & Groceries in Katy, TX`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  icons: { icon: asset("/mark.svg") },
  openGraph: {
    title: site.fullName,
    description: site.description,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rubik.variable} ${nunito.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-on-primary"
        >
          Skip to main content
        </a>
        <CartProvider>
          <MotionProvider>
          <Header />
          <main id="main" tabIndex={-1} className="min-h-[60vh]">{children}</main>
          <Footer />
          </MotionProvider>
        </CartProvider>
      </body>
    </html>
  );
}
