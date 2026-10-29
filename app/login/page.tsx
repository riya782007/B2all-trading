import LoginForm from "./form";
import Link from "next/link";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="font-display text-xl font-semibold text-brand">B2All <span className="font-normal text-muted">Commo</span></Link>
      <h1 className="mt-6 font-display text-3xl font-semibold text-brand">Welcome</h1>
      <p className="mt-2 text-muted">Tell us who you are once. No password, no code.</p>
      <LoginForm next={next} />
          </main>
  );
}
