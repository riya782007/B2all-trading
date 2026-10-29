import LoginForm from "./form";
import Link from "next/link";
import { hasSupabase } from "@/lib/supabase";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="font-display text-xl font-semibold text-brand">B2All <span className="font-normal text-muted">Commo</span></Link>
      <h1 className="mt-6 font-display text-3xl font-semibold text-brand">Sign in</h1>
      <p className="mt-2 text-muted">We use your mobile number so you never need a password.</p>
      <LoginForm next={next} />
      {!hasSupabase && <p className="mt-6 rounded-xl bg-soft p-3 text-sm text-muted">Demo mode: any name, city and number works, and the code is <b>123456</b>. Use <b>9000000000</b> to enter as the owner.</p>}
    </main>
  );
}
