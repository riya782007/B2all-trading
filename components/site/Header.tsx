import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getMe } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import BasketCount from "./BasketCount";

export default async function Header() {
  const me = await getMe();
  const customer = me?.profile.role === "customer" ? me.profile : null;
  return (
    <header className="noprint sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto" aria-label="B2All home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex"><Link href="/#materials" className="btn btn-text">Materials</Link><Link href="/#how" className="btn btn-text">How it works</Link></nav>
        <Link href="/basket" className="relative grid size-10 place-items-center rounded-lg hover:bg-s2" aria-label="My enquiry"><ShoppingBag size={20} /><BasketCount /></Link>
        <ThemeToggle />
        {customer ? <Link href="/account" className="grid size-10 place-items-center rounded-lg bg-ink font-bold text-s1" aria-label="My account">{customer.name.charAt(0).toUpperCase()}</Link> : <Link href="/login" className="btn btn-filled">Sign in</Link>}
      </div>
    </header>
  );
}
