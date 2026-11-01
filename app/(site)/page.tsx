import Link from "next/link";
import { Flame, Gem, Mountain, Recycle, Layers, ClipboardList, MessagesSquare, Truck } from "lucide-react";
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
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="font-semibold text-ink2">Raigarh, Chhattisgarh. Supplying plants across India.</p>
          <h1 className="mt-4 text-[2.8rem] sm:text-[4.6rem]">Coal, ore and alloys, delivered and accounted for.</h1>
          <p className="mt-6 max-w-lg text-lg text-ink2">For steel mills, power plants and factories. Ask for what you need in one tap, follow every truck, and keep every invoice and contract on your own page.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#materials" className="btn btn-filled btn-lg">Start an enquiry</a>{!loggedIn && <Link href="/login" className="btn btn-outline btn-lg">Sign in</Link>}</div>
        </div>
        <div className="grid grid-cols-2 gap-3" aria-hidden>
          {cats.slice(0, 4).map((c, i) => { const C = CAT[c] ?? CAT.Minerals; const Icon = C.icon; return (
            <a key={c} href={`#cat-${c}`} className={`group flex aspect-[4/3.4] flex-col justify-between rounded-[14px] bg-gradient-to-br p-5 ${C.tone} ${i % 2 ? "translate-y-6" : ""}`}><Icon size={28} strokeWidth={1.6} /><div className="text-[1.35rem] font-extrabold" style={{ fontStretch: "118%" }}>{c}</div></a>); })}
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
          <div key={i} className="border-t-4 border-ink pt-5"><div className="flex items-center gap-3"><span className="text-[2rem] font-extrabold leading-none" style={{ fontStretch: "122%" }}>{i + 1}</span><I2 size={20} className="text-ink2" /></div><div className="display mt-4 text-[1.15rem]">{t as string}</div><p className="mt-1 text-ink2">{d as string}</p></div>); })}
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4">
      <div className="flex flex-col items-start justify-between gap-5 rounded-[14px] bg-rail p-8 text-white sm:flex-row sm:items-center sm:p-10">
        <div><div className="text-[1.9rem] font-extrabold" style={{ fontStretch: "118%" }}>Your next order is one tap away.</div><p className="mt-1 text-rail-ink">Your history, invoices and deliveries stay on your own page.</p></div>
        <a href="#materials" className="btn btn-filled btn-lg">Start an enquiry</a>
      </div>
    </section>
  </>);
}
