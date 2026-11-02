import Link from "next/link";
import { Flame, Gem, Mountain, Recycle, Layers, ClipboardList, MessagesSquare, Truck, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import AddButton from "@/components/site/AddButton";

const CAT: Record<string, { icon: typeof Flame; tone: string }> = {
  Coal: { icon: Flame, tone: "from-[#2a2d33] to-[#0f1114] text-white" },
  "Ferro alloys": { icon: Gem, tone: "from-[#6b7682] to-[#353d47] text-white" },
  "Iron ore": { icon: Mountain, tone: "from-[#9b3f1d] to-[#561f0c] text-white" },
  Scrap: { icon: Recycle, tone: "from-[#7a6a52] to-[#3f3527] text-white" },
  Minerals: { icon: Layers, tone: "from-[#d9d3c4] to-[#a69d88] text-[#22201a]" },
};

export default async function Home() {
  const [me, s] = await Promise.all([getMe(), getStore()]);
  const mats = (await s.all("materials")).filter((m) => m.active);
  const cats = [...new Set(mats.map((m) => m.category))];
  const loggedIn = me?.profile.role === "customer";
  return (<>
    <section className="relative overflow-hidden border-b border-line bg-s1">
      <div className="pointer-events-none absolute -right-40 -top-40 size-[650px] rounded-full bg-pri-c/60 blur-3xl" aria-hidden/>
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
        <div><p className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5 text-xs font-semibold tracking-wide text-pri"><span className="size-1.5 rounded-full bg-pri"/>INDUSTRIAL MATERIALS. PERSONAL SERVICE.</p>
          <h1 className="mt-6 max-w-2xl text-[clamp(2.6rem,5vw,4.4rem)]">Keep your supply moving.<span className="block text-pri">Keep your business ahead.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink2">Coal, ore, alloys and minerals for the industries building India. One place to enquire, follow your deliveries and find every document.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#materials" className="btn btn-filled btn-lg">Explore materials<ArrowUpRight size={18}/></a><Link href={loggedIn ? "/account" : "/login"} className="btn btn-outline btn-lg">{loggedIn ? "My supply desk" : "Your customer account"}</Link></div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-ink2"><span className="flex items-center gap-1.5"><Check size={15} className="text-pri"/>Quotes for your grade</span><span className="flex items-center gap-1.5"><Check size={15} className="text-pri"/>Delivery visibility</span><span className="flex items-center gap-1.5"><Check size={15} className="text-pri"/>Documents together</span></div>
        </div>
        <div className="relative rounded-3xl border border-line bg-bg p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-line pb-5"><div><p className="text-xs font-medium text-ink2">YOUR B2ALL SUPPLY DESK</p><h2 className="mt-1 text-xl">From enquiry to delivery.</h2></div><ShieldCheck className="text-pri" size={25}/></div>
          <div className="my-5 grid grid-cols-2 gap-2">{cats.slice(0,4).map(c=>{const C=CAT[c]??CAT.Minerals;const Icon=C.icon;return <a href={`#cat-${c}`} key={c} className="flex items-center gap-3 rounded-xl border border-line bg-s1 p-3 text-sm font-semibold hover:border-pri"><Icon size={19} className="text-pri"/>{c}<ArrowUpRight size={14} className="ml-auto text-ink2"/></a>})}</div>
          <ol className="space-y-0">{[[ClipboardList,"Your requirements","Grade, quantity and delivery location"],[MessagesSquare,"A personal quote","Reviewed with the B2All team"],[Truck,"Supply, with visibility","Vehicles, receipts and invoices in your account"]].map(([Icon,title,desc],i)=>{const I=Icon as typeof Truck;return <li key={String(title)} className="relative flex gap-4 py-4">{i<2 && <div className="absolute bottom-[-16px] left-5 top-14 border-l border-line"/>}<span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-s1 text-pri"><I size={19}/></span><div><div className="font-semibold">{String(title)}</div><p className="mt-1 text-xs text-ink2">{String(desc)}</p></div></li>})}</ol>
          <div className="mt-3 rounded-xl bg-pri-c p-4 text-sm text-on-pri-c"><b>Built around your business.</b><p className="mt-1 text-xs">Your orders, your documents, your next enquiry. Always easy to find.</p></div>
        </div>
      </div>
    </section>

    <section id="materials" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
      <h2 className="text-[2rem]">What we supply</h2>
      <p className="mt-1 text-ink2">Prices move daily, so we quote for your grade and quantity.</p>
      <div className="mt-5 flex flex-wrap gap-2">{cats.map((c) => <a key={c} href={`#cat-${c}`} className="filter">{c}</a>)}</div>
      {cats.map((c) => (
        <div key={c} id={`cat-${c}`} className="scroll-mt-20 pt-8">
          <h3 className="mb-3 text-[1.05rem] text-ink2">{c}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mats.filter((m) => m.category === c).map((m) => { const C = CAT[m.category] ?? CAT.Minerals; const Icon = C.icon; return (
              <article key={m.id} className="card flex flex-col gap-4 p-5">
                <div className="flex items-start gap-4"><div className={`grid size-12 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br ${C.tone}`}><Icon size={22} /></div><div><h4 className="display text-[1.1rem]">{m.name}</h4><p className="text-sm text-ink2">{m.note || "Grade and quantity as you need"}</p></div></div>
                <AddButton id={m.id} loggedIn={loggedIn} />
              </article>); })}
          </div>
        </div>
      ))}
    </section>

    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
      <h2 className="text-[2rem]">How it works</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {[[ClipboardList, "Tell us what you need", "Pick materials and quantities. One tap sends it."], [MessagesSquare, "Get a quote and contract", "We quote for your grade. Sign the contract right from your page."], [Truck, "Track every truck", "See each dispatch, vehicle, e-way bill and invoice the moment it happens."]].map(([Icon, t, d], i) => { const I2 = Icon as typeof Flame; return (
          <div key={i} className="border-t-4 border-ink pt-5"><div className="flex items-center gap-3"><span className="text-[2rem] font-extrabold leading-none">{i + 1}</span><I2 size={20} className="text-ink2" /></div><div className="display mt-4 text-[1.15rem]">{t as string}</div><p className="mt-1 text-ink2">{d as string}</p></div>); })}
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4">
      <div className="flex flex-col items-start justify-between gap-5 rounded-[14px] bg-rail p-8 text-white sm:flex-row sm:items-center sm:p-10">
        <div><div className="text-[1.9rem] font-extrabold">Your next order is one tap away.</div><p className="mt-1 text-rail-ink">Your history, invoices and deliveries stay on your own page.</p></div>
        <a href="#materials" className="btn btn-filled btn-lg">Start an enquiry</a>
      </div>
    </section>
  </>);
}
