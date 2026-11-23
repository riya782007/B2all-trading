import { MessageCircle } from "lucide-react";
import Header from "@/components/site/Header";
import { publicContact } from "@/lib/contact";
import { wa } from "@/lib/links";
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = await publicContact(); const num = c.whatsapp || "";
  return (<div className="customer-site">
    <Header />
    <main>{children}</main>
    <footer className="noprint mt-4 border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink2"><span>B2 All Commo Trade Pvt. Ltd. · Raigarh, Chhattisgarh</span>{(c.phone || c.email) && <span>{[c.phone, c.email].filter(Boolean).join(" · ")}</span>}<span>Coal · Ferro alloys · Iron ore · Scrap · Minerals</span></div>
    </footer>
    {num && <a href={wa(num, "Hello B2All, I would like a quote for ")} target="_blank" rel="noreferrer" className="noprint fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#1f8f4e] px-5 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow)] hover:brightness-110" aria-label="Chat with B2All on WhatsApp"><MessageCircle size={20} />Chat on WhatsApp</a>}
  </div>);
}
