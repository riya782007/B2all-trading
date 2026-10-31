import Header from "@/components/site/Header";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (<>
    <Header />
    <main>{children}</main>
    <footer className="noprint mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink2"><span>B2 All Commo Trade Pvt. Ltd. · Raigarh, Chhattisgarh</span><span>Coal · Ferro alloys · Iron ore · Scrap · Minerals</span></div>
    </footer>
  </>);
}
