import { MessageCircle } from "lucide-react";
import Header from "@/components/site/Header";
import { publicContact } from "@/lib/contact";
import { wa } from "@/lib/links";
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = await publicContact(); const num = c.whatsapp || "";
  return (<div className="customer-site">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "B2 All Commo Trade Pvt. Ltd.", url: "https://b2alltrading.vercel.app", foundingDate: "2017", address: { "@type": "PostalAddress", addressLocality: "Raigarh", addressRegion: "Chhattisgarh", postalCode: "496001", addressCountry: "IN" }, ...(c.phone ? { telephone: c.phone } : {}), ...(c.email ? { email: c.email } : {}), areaServed: ["Chhattisgarh", "Maharashtra", "Andhra Pradesh", "Bihar", "Jharkhand"], knowsAbout: ["Coal", "Ferro alloys", "Iron ore", "Scrap", "Dolomite", "Limestone", "Quartz"] }).replace(/</g, "\\u003c") }} />
    <Header />
    <main className={num ? "pb-20 sm:pb-0" : ""}>{children}</main>
    <footer className="noprint mt-4 border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink2"><span>B2 All Commo Trade Pvt. Ltd. · Raigarh, Chhattisgarh</span>{(c.phone || c.email) && <span>{[c.phone, c.email].filter(Boolean).join(" · ")}</span>}<span>Coal · Ferro alloys · Iron ore · Scrap · Minerals</span></div>
    </footer>
    {num && <a href={wa(num, "Hello B2All, I would like a quote for ")} target="_blank" rel="noreferrer" className="noprint fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center gap-2 rounded-full bg-[#1f8f4e] text-sm font-semibold text-white shadow-[var(--shadow)] hover:brightness-110 sm:bottom-5 sm:right-5 sm:size-auto sm:px-5 sm:py-3.5" aria-label="Chat with B2All on WhatsApp"><MessageCircle size={22} /><span className="hidden sm:inline">Chat on WhatsApp</span></a>}
  </div>);
}
