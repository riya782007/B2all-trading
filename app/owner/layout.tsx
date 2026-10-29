import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/store";

const NAV = [["/owner", "Today"], ["/owner/enquiries", "Enquiries"], ["/owner/customers", "Customers"], ["/owner/offers", "Offers"]];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u || u.role !== "owner") redirect("/login?next=/owner");
  return (
    <div className="mx-auto min-h-screen max-w-5xl md:flex">
      <aside className="hidden w-52 shrink-0 border-r border-line p-5 md:block">
        <Link href="/" className="font-display text-xl font-semibold text-brand">B2All</Link>
        <div className="mt-1 text-xs text-muted">Owner console</div>
        <nav className="mt-8 space-y-1">{NAV.map(([h, l]) => <Link key={h} href={h} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-soft">{l}</Link>)}</nav>
      </aside>
      <main className="flex-1 px-4 pb-28 pt-6 md:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-card md:hidden">
        {NAV.map(([h, l]) => <Link key={h} href={h} className="py-4 text-center text-sm font-semibold">{l}</Link>)}
      </nav>
    </div>
  );
}
