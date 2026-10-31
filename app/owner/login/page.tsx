import type { Metadata } from "next";
import { hasSupabase } from "@/lib/supabase";
import { getStore } from "@/lib/store";
import InstallApp from "@/components/InstallApp";
import ThemeToggle from "@/components/ThemeToggle";
import StaffForm from "./form";

export const metadata: Metadata = { title: "Console sign in", robots: { index: false, follow: false }, manifest: "/owner-manifest.webmanifest" };
export default async function StaffLogin() {
  const demo = !hasSupabase ? (await (await getStore()).all("profiles")).filter((p) => p.role !== "customer").map((p) => ({ id: p.id, name: p.name, role: p.role })) : [];
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-pri text-lg font-bold text-on-pri">B2</span><h1 className="mt-4 text-3xl font-semibold">B2All console</h1><p className="mt-1 text-ink2">Sales, stock, accounts and team in one place.</p></div>
        <InstallApp />
        <div className="card p-6 sm:p-8"><StaffForm demo={demo} /></div>
      </div>
    </div>
  );
}
