import Link from "next/link";
import { ArrowRight, Flame, Gem, Mountain, Recycle, Layers, ClipboardList, MessagesSquare, Truck } from "lucide-react";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import AddButton from "@/components/site/AddButton";

const CAT: Record<string, { icon: typeof Flame; tone: string }> = {
  Coal: { icon: Flame, tone: "from-[#2d3a34] to-[#121815] text-white" },
  "Ferro alloys": { icon: Gem, tone: "from-[#5b6670] to-[#2c343b] text-white" },
  "Iron ore": { icon: Mountain, tone: "from-[#8a4b2c] to-[#4d2716] text-white" },
  Scrap: { icon: Recycle, tone: "from-[#5e6b53] to-[#2f3829] text-white" },
  Minerals: { icon: Layers, tone: "from-[#c9bfa8] to-[#8f846c] text-[#1f1a10]" },
};

export default async function Home() {
  const [me, s] = await Promise.all([getMe(), getStore()]);
  const mats = (await s.all("materials")).filter((m) => m.active);
  const cats = [...new Set(mats.map((m) => m.category))];
  const loggedIn = me?.profile.role === "customer";
  return (<>
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <span className="chip chip-green">Raigarh, Chhattisgarh · Supplying across India</span>
          <h1 className="mt-5 text-[2.9rem] font-semibold leading-[1.02] sm:text-[4.4rem]">Raw materials,<br /><span className="text-pri">without the running around.</span></h1>
          <p className="mt-5 max-w-lg text-lg text-ink2">Coal, ferro alloys, iron ore, scrap and minerals for steel mills, power plants and factories. Ask once, track every truck, keep every bill in one place.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#materials" className="btn btn-filled btn-lg">Start an enquiry <ArrowRight size={18} /></a>{!loggedIn && <Link href="/login" className="btn btn-outline btn-lg">Sign in</Link>}</div>
        </div>
        <div className="grid grid-cols-2 gap-3" aria-hidden>
          {cats.slice(0, 4).map((c, i) => { const C = CAT[c] ?? CAT.Minerals; const Icon = C.icon; return (
            <a key={c} href={`#cat-${c}`} className={`group flex aspect-[4/3.4] flex-col justify-between rounded-[1.75rem] bg-gradient-to-br p-5 ${C.tone} ${i % 2 ? "translate-y-6" : ""}`}><Icon size={30} strokeWidth={1.6} /><div className="display text-xl font-medium">{c}</div></a>); })}
        </div>
      </div>
    </section>

    <section id="materials" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
      <h2 className="text-3xl font-medium">What we supply</h2>
      <p className="mt-1 text-ink2">Prices move daily, so we quote for your grade and quantity.</p>
      <div className="mt-5 flex flex-wrap gap-2">{cats.map((c) => <a key={c} href={`#cat-${c}`} className="filter">{c}</a>)}</div>
      {cats.map((c) => (
        <div key={c} id={`cat-${c}`} className="scroll-mt-20 pt-8">
          <h3 className="mb-3 text-sm font-medium tracking-wide text-ink2">{c.toUpperCase()}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mats.filter((m) => m.category === c).map((m) => { const C = CAT[m.category] ?? CAT.Minerals; const Icon = C.icon; return (
              <article key={m.id} className="card flex flex-col gap-4 p-5">
                <div className="flex items-start gap-4"><div className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${C.tone}`}><Icon size={22} /></div><div><h4 className="display text-lg font-medium">{m.name}</h4><p className="text-sm text-ink2">{m.note || "Grade and quantity as you need"}</p></div></div>
                <AddButton id={m.id} loggedIn={loggedIn} />
              </article>); })}
          </div>
        </div>
      ))}
    </section>

    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
      <h2 className="text-3xl font-medium">How it works</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[[ClipboardList, "Tell us what you need", "Pick materials and quantities. One tap sends it."], [MessagesSquare, "Get a quote and contract", "We quote for your grade. Sign the contract right from your page."], [Truck, "Track every truck", "See each dispatch, vehicle, e-way bill and invoice the moment it happens."]].map(([Icon, t, d], i) => { const I2 = Icon as typeof Flame; return (
          <div key={i} className="card-tonal p-6"><div className="grid size-11 place-items-center rounded-full bg-pri-c text-on-pri-c"><I2 size={20} /></div><div className="display mt-4 text-lg font-medium">{t as string}</div><p className="mt-1 text-ink2">{d as string}</p></div>); })}
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4">
      <div className="flex flex-col items-start justify-between gap-5 rounded-[2rem] bg-pri p-8 text-on-pri sm:flex-row sm:items-center sm:p-10">
        <div><div className="display text-3xl font-medium">Your next order, in one tap.</div><p className="mt-1 opacity-85">Your history, invoices and deliveries stay on your own page.</p></div>
        <a href="#materials" className="btn btn-lg bg-on-pri text-pri">Start an enquiry</a>
      </div>
    </section>
  </>);
}
