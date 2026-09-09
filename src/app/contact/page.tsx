import type { Metadata } from "next";
import { site, phoneIsPlaceholder, addressIsPlaceholder, addressLines, emailIsPlaceholder } from "@/lib/site.config";
import { PhoneIcon, PinIcon, ClockIcon } from "@/components/icons";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${site.fullName} in Katy, TX.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <div className="max-w-2xl">
        <span className="text-sm font-bold uppercase tracking-widest text-primary">Get in touch</span>
        <h1 className="mt-2 font-display text-4xl font-bold">We&apos;d love to hear from you</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about a product, a bulk order, or a custom cut? Reach out and we&apos;ll get right back to you.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ContactForm />

        <aside className="space-y-4">
          <InfoCard icon={<PinIcon width={22} height={22} />} title="Visit the store">
            {addressLines().map((l, i) => <span key={l}>{i > 0 && <br />}{l}</span>)}
            {addressIsPlaceholder && (
              <><br /><span className="text-xs">Street address published shortly — message us on WhatsApp and we&apos;ll send directions.</span></>
            )}
          </InfoCard>
          <InfoCard icon={<PhoneIcon width={22} height={22} />} title="Call or WhatsApp">
            {phoneIsPlaceholder
              ? <span>Phone number coming soon</span>
              : <a href={`tel:${site.phone.replace(/[^0-9+]/g, "")}`} className="hover:text-primary">{site.phone}</a>}<br />
            {emailIsPlaceholder ? (
              <>
                <a href={site.socials.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  Message us on WhatsApp
                </a>
                <br />
                <a href={site.socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  Facebook
                </a>
                {" · "}
                <a href={site.socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  TikTok
                </a>
              </>
            ) : (
              <a href={`mailto:${site.email}`} className="hover:text-primary">{site.email}</a>
            )}
          </InfoCard>
          <InfoCard icon={<ClockIcon width={22} height={22} />} title="Store hours">
            <ul className="space-y-1">
              {site.hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span className="font-medium text-foreground/80">{h.day}</span>
                  <span className="text-right text-muted-foreground">{h.time}</span>
                </li>
              ))}
            </ul>
          </InfoCard>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary">{icon}</span>
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </div>
  );
}
