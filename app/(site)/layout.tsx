import Header from "@/components/site/Header";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (<div className="customer-site">
    <Header />
    <main>{children}</main>
    <footer className="noprint mt-4 border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink2"><span>B2 All Commo Trade Pvt. Ltd. · Raigarh, Chhattisgarh</span><span>Coal · Ferro alloys · Iron ore · Scrap · Minerals</span></div>
    </footer>
  </div>);
}
