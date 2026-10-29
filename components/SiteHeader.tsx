import Link from "next/link";
import { getUser } from "@/lib/store";

export default async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-brand">B2All <span className="text-muted font-normal">Commo</span></Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/basket" className="btn btn-ghost !min-h-10 !py-2">My enquiry</Link>
          {user && user.role !== "owner" ? (
            <Link href="/account" className="btn btn-primary !min-h-10 !py-2">{user.name.split(" ")[0]}</Link>
          ) : (
            <Link href="/login" className="btn btn-primary !min-h-10 !py-2">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
