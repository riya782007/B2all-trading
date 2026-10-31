import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Search, LogOut } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { SideNav, MobileNav, CreateMenu, type NavGroup } from "@/components/console/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import InstallApp from "@/components/InstallApp";
import { signOut } from "@/app/actions";

export const metadata: Metadata = { manifest: "/owner-manifest.webmanifest", robots: { index: false, follow: false }, appleWebApp: { capable: true, title: "B2All", statusBarStyle: "default" }, icons: { apple: "/pwa-icon/180" }, title: "Console" };
export const viewport: Viewport = { themeColor: "#126b47" };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = (await staff())!;
  const s = await getStore();
  const newEnq = (await s.all("enquiries", { status: "new" })).length;
  const a = (m: Parameters<typeof allowed>[1], act: Parameters<typeof allowed>[2] = "view") => allowed(me, m, act);
  const groups = ([
    { label: "", items: [{ href: "/owner", label: "Home", icon: "House" }] },
    { label: "Sell", items: [
      ...(a("crm") ? [{ href: "/owner/enquiries", label: "Enquiries", icon: "Inbox" as const, badge: newEnq }] : []),
      ...(a("sales") ? [{ href: "/owner/orders?kind=sale", label: "Sales orders", icon: "FileText" as const }, { href: "/owner/contracts", label: "Contracts", icon: "FileSignature" as const }, { href: "/owner/invoices?kind=sale", label: "Invoices", icon: "ReceiptIndianRupee" as const }] : []),
    ] },
    { label: "Buy", items: a("purchase") ? [{ href: "/owner/orders?kind=purchase", label: "Purchase orders", icon: "ShoppingCart" }, { href: "/owner/invoices?kind=purchase", label: "Supplier bills", icon: "FileInput" }] : [] },
    { label: "Stock", items: a("inventory") ? [{ href: "/owner/stock", label: "Stock", icon: "Boxes" }, { href: "/owner/deliveries", label: "Dispatch and receipts", icon: "Truck" }, { href: "/owner/eway", label: "E-way bills", icon: "Route" }] : [] },
    { label: "Money", items: a("accounts") ? [{ href: "/owner/accounts", label: "Day book", icon: "BookOpen" }, { href: "/owner/accounts/outstanding", label: "Outstanding", icon: "Clock" }, { href: "/owner/accounts/ledgers", label: "Ledgers", icon: "Library" }, { href: "/owner/accounts/reports", label: "Trial balance and GST", icon: "Scale" }, { href: "/owner/accounts/tally", label: "Tally", icon: "FileDown" }] : [] },
    { label: "People", items: [...(a("crm") ? [{ href: "/owner/parties?type=customer", label: "Customers", icon: "Users" as const }, { href: "/owner/offers", label: "Offers", icon: "Megaphone" as const }] : []), ...(a("purchase") ? [{ href: "/owner/parties?type=supplier", label: "Suppliers", icon: "Factory" as const }] : [])] },
    { label: "Admin", items: a("admin") ? [{ href: "/owner/team", label: "Team and roles", icon: "ShieldCheck" }, { href: "/owner/settings", label: "Settings", icon: "Settings" }, { href: "/owner/activity", label: "Activity", icon: "History" }] : [] },
  ] as NavGroup[]).filter((g) => g.items.length);
  const create = [
    ...(a("sales", "create") ? [{ href: "/owner/orders/new?kind=sale", label: "Sales order", icon: "FileText" as const }] : []),
    ...(a("purchase", "create") ? [{ href: "/owner/orders/new?kind=purchase", label: "Purchase order", icon: "ShoppingCart" as const }] : []),
    ...(a("inventory", "create") ? [{ href: "/owner/deliveries/new", label: "Dispatch or receipt", icon: "Truck" as const }] : []),
    ...(a("sales", "create") ? [{ href: "/owner/invoices/new?kind=sale", label: "Sales invoice", icon: "ReceiptIndianRupee" as const }] : []),
    ...(a("purchase", "create") ? [{ href: "/owner/invoices/new?kind=purchase", label: "Supplier bill", icon: "FileInput" as const }] : []),
    ...(a("accounts", "create") ? [{ href: "/owner/accounts/new?type=receipt", label: "Payment received", icon: "ArrowDownLeft" as const }, { href: "/owner/accounts/new?type=payment", label: "Payment made", icon: "ArrowUpRight" as const }, { href: "/owner/accounts/new?type=expense", label: "Expense", icon: "Wallet" as const }] : []),
    ...(a("crm", "create") ? [{ href: "/owner/parties/new?type=customer", label: "Customer", icon: "UserPlus" as const }] : []),
  ];
  const initials = me.profile.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="noprint sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto px-3 py-4 lg:block">
        <Link href="/owner" className="mb-6 flex items-center gap-2 px-4"><span className="grid size-8 place-items-center rounded-xl bg-pri text-sm font-bold text-on-pri">B2</span><span className="display text-xl font-semibold">B2All</span></Link>
        <SideNav groups={groups} />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="noprint sticky top-0 z-20 flex h-16 items-center gap-2 bg-bg/90 px-3 backdrop-blur sm:px-5">
          <MobileNav groups={groups} />
          <form action="/owner/search" className="relative max-w-xl flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink2" />
            <input name="q" placeholder="Search customers, orders, bills, vehicles" aria-label="Search" className="h-11 w-full rounded-full bg-s2 pl-11 pr-4 text-[.95rem] outline-none placeholder:text-ink2 focus:bg-s1 focus:shadow-[0_0_0_1px_var(--pri)]" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <CreateMenu items={create} />
            <ThemeToggle />
            <div className="group relative">
              <button className="grid size-10 place-items-center rounded-full bg-pri-c text-sm font-semibold text-on-pri-c" aria-label={`Signed in as ${me.profile.name}`}>{initials}</button>
              <div className="invisible absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-line bg-s1 p-3 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="px-2 font-medium">{me.profile.name}</div><div className="px-2 text-sm text-ink2">{me.profile.role === "owner" ? "Owner" : me.role?.name}</div>
                <form action={signOut} className="mt-2"><button className="btn btn-text w-full !justify-start"><LogOut size={16} />Sign out</button></form>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 pb-24 pt-4 sm:px-6 lg:px-8"><InstallApp />{children}</main>
      </div>
    </div>
  );
}
