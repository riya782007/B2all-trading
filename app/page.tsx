import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import AddToBasket from "@/components/AddToBasket";
import { getUser, listMaterials } from "@/lib/store";

const STEPS = [
  ["Tell us what you need", "Pick materials and quantities. No prices to compare, because rates move every day."],
  ["We find it and quote", "We check the market for your grade and come back with a rate, usually the same day."],
  ["Contract, dispatch, delivery", "Terms are confirmed in writing, and you can follow your order from your own page."],
];

export default async function Home() {
  const [user, mats] = await Promise.all([getUser(), listMaterials()]);
  const cats = [...new Set(mats.map((m) => m.category))];
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-5xl px-4 pb-10 pt-14 sm:pt-20">
          <p className="text-sm font-medium tracking-wide text-brand2">RAIGARH, CHHATTISGARH · SUPPLYING INDIA</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-brand sm:text-6xl">Materials that move industry forward.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">Coal, ferro alloys, iron ore, scrap and minerals for steel mills, power plants and factories. Tell us what you need and we will bring you a quote.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#materials" className="btn btn-primary">Browse materials</a>
            {(!user || user.role === "owner") && <Link href="/login" className="btn btn-ghost">Sign in with your mobile</Link>}
          </div>
        </section>

        <section id="materials" className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-2xl font-semibold text-brand">What we supply</h2>
          {cats.map((cat) => (
            <div key={cat} className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{cat}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mats.filter((m) => m.category === cat).map((m) => (
                  <div key={m.id} className="card flex flex-col justify-between gap-4 p-5">
                    <div>
                      <div className="text-lg font-semibold">{m.name}</div>
                      <div className="mt-1 text-sm text-muted">{m.note ?? "Grade and quantity as you need"}</div>
                    </div>
                    <AddToBasket id={m.id} loggedIn={!!user} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-2xl font-semibold text-brand">How it works</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="card p-5">
                <div className="text-sm font-semibold text-accent">Step {i + 1}</div>
                <div className="mt-1 font-semibold">{t}</div>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-line py-8 text-center text-sm text-muted">B2 All Commo Trade Pvt. Ltd. · Raigarh, Chhattisgarh</footer>
      </main>
    </>
  );
}
