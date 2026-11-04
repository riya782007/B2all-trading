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
    <header className="noprint sticky top-0 z-30 border-b border-line bg-s1/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center gap-2 px-4">
        <Link href="/" className="mr-auto" aria-label="B2All home"><Logo /></Link>
        <nav aria-label="Website" className="hidden items-center gap-1 lg:flex"><Link href="/#materials" className="btn btn-text">Materials</Link><Link href="/#operations" className="btn btn-text">What we do</Link><Link href="/#group" className="btn btn-text">Our group</Link><Link href="/#contact" className="btn btn-text">Contact</Link></nav>
        <Link href="/basket" className="relative grid size-11 place-items-center rounded-lg hover:bg-s2" aria-label="My enquiry"><ShoppingBag size={20} /><BasketCount /></Link>
        <ThemeToggle />
        {customer ? <Link href="/account" className="grid size-11 place-items-center rounded-lg bg-ink font-bold text-s1" aria-label="My account">{customer.name.charAt(0).toUpperCase()}</Link> : <Link href="/login" className="btn btn-filled">Customer login</Link>}
      </div>
      <nav aria-label="Website sections" className="flex gap-5 overflow-x-auto border-t border-line px-4 py-3 text-xs text-ink2 lg:hidden"><Link href="/#materials">Materials</Link><Link href="/#operations" className="whitespace-nowrap">What we do</Link><Link href="/#group" className="whitespace-nowrap">Our group</Link><Link href="/#contact">Contact</Link></nav>
    </header>
  );
}
