import Link from "next/link";
import OwnerForm from "./form";
import { hasSupabase } from "@/lib/supabase";

export default function OwnerLogin() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="font-display text-xl font-semibold text-brand">B2All <span className="font-normal text-muted">Owner console</span></Link>
      <h1 className="mt-6 font-display text-3xl font-semibold text-brand">Owner sign in</h1>
      <OwnerForm demo={!hasSupabase} />
    </main>
  );
}
