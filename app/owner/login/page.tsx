import Link from "next/link";
import OwnerForm from "./form";
import InstallApp from "@/components/InstallApp";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/owner-manifest.webmanifest" };
import { hasSupabase } from "@/lib/supabase";

export default function OwnerLogin() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="font-display text-xl font-semibold text-brand">B2All <span className="font-normal text-muted">Owner console</span></Link>
      <h1 className="mt-6 font-display text-3xl font-semibold text-brand">Owner sign in</h1>
      <p className="mt-2 text-muted">The control panel runs as an app on your phone or computer. Install it, then sign in.</p>
      <div className="mt-4"><InstallApp /></div>
      <OwnerForm demo={!hasSupabase} />
    </main>
  );
}
