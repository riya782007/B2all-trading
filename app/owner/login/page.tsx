import type { Metadata } from "next";
import { Truck, ReceiptIndianRupee, Boxes } from "lucide-react";
import { hasSupabase } from "@/lib/supabase";
import { getStore } from "@/lib/store";
import InstallApp from "@/components/InstallApp";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import StaffForm from "./form";

export const metadata: Metadata = { title: "Console sign in", robots: { index: false, follow: false }, manifest: "/owner-manifest.webmanifest" };

export default async function StaffLogin() {
  const demo = !hasSupabase ? (await (await getStore()).all("profiles")).filter((p) => p.role !== "customer").map((p) => ({ id: p.id, name: p.name, role: p.role })) : [];
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-rail px-6 py-8 text-rail-hi sm:px-10 lg:px-14 lg:py-12">
        <Logo tone="light" size="lg" />
        <div className="my-10 lg:my-0">
          <h1 className="max-w-xl text-[2.5rem] text-white sm:text-[3.4rem] lg:text-[4rem]">Every truck.<br />Every bill.<br />One desk.</h1>
          <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-rail-ink">Orders, dispatches, GST invoices, stock and accounts for B2 All Commo, kept in step with Tally.</p>
          <ul className="mt-8 hidden space-y-3 text-rail-ink sm:block">
            {[[Truck, "Part loads matched to their order as they arrive"], [ReceiptIndianRupee, "Invoices, payments and outstanding in one place"], [Boxes, "Stock that updates itself from every truck"]].map(([I, t], k) => { const Icon = I as typeof Truck; return <li key={k} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-rail-hover text-act"><Icon size={17} /></span>{t as string}</li>; })}
          </ul>
        </div>
        <p className="hidden text-sm text-rail-ink/70 lg:block">Raigarh, Chhattisgarh</p>
        <svg aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 hidden h-80 w-80 text-rail-hover lg:block" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="18"><path d="M20 180 L100 20 L180 180 Z" /></svg>
      </section>
      <section className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="w-full max-w-sm">
          <h2 className="text-[1.7rem]">Sign in</h2>
          <p className="mb-7 mt-1 text-ink2">Use your work email. Your role decides what you see.</p>
          <StaffForm demo={demo} />
          <div className="mt-6"><InstallApp /></div>
        </div>
      </section>
    </div>
  );
}
