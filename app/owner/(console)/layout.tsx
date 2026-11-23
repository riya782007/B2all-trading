import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Search, LogOut, Building2, ArrowUpRight } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { SideNav, MobileNav, CreateMenu, type NavGroup } from "@/components/console/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { hasSupabase } from "@/lib/supabase";
import Breadcrumb from "@/components/console/Breadcrumb";
import InstallApp from "@/components/InstallApp";
import Shortcuts from "@/components/console/Shortcuts";
import { signOut } from "@/app/actions";

export const metadata: Metadata = { manifest: "/owner-manifest.webmanifest", robots: { index: false, follow: false }, appleWebApp: { capable: true, title: "B2All", statusBarStyle: "default" }, icons: { apple: "/pwa-icon/180" }, title: "Console" };
export const viewport: Viewport = { themeColor: "#f6f7f3" };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = (await staff())!;
  const s = await getStore();
  const newEnq = allowed(me, "crm") ? (await s.all("enquiries", { status: "new" })).length : 0;
  const a = (m: Parameters<typeof allowed>[1], act: Parameters<typeof allowed>[2] = "view") => allowed(me, m, act);
  const groups = ([
    { label: "", items: [{ href: "/owner", label: "Overview", icon: "House" }] },
    { label: "Sell", items: [
      ...(a("crm") ? [{ href: "/owner/enquiries", label: "Enquiries", icon: "Inbox" as const, badge: newEnq }] : []),
      ...(a("sales") ? [{ href: "/owner/orders?kind=sale", label: "Sales orders", icon: "FileText" as const }, { href: "/owner/contracts", label: "Contracts", icon: "FileSignature" as const }, { href: "/owner/invoices?kind=sale", label: "Invoices", icon: "ReceiptIndianRupee" as const }] : []),
    ] },
    { label: "Buy", items: a("purchase") ? [{ href: "/owner/orders?kind=purchase", label: "Purchase orders", icon: "ShoppingCart" }, { href: "/owner/invoices?kind=purchase", label: "Supplier bills", icon: "FileInput" }, { href: "/owner/matching", label: "Bill matching", icon: "GitCompareArrows" }] : [] },
    { label: "Stock", items: a("inventory") ? [{ href: "/owner/stock", label: "Stock", icon: "Boxes" }, { href: "/owner/deliveries", label: "Dispatch and receipts", icon: "Truck" }, { href: "/owner/eway", label: "E-way bills", icon: "Route" }] : [] },
    { label: "Accounts", items: a("accounts") ? [{ href: "/owner/accounts", label: "Day book", icon: "BookOpen" }, ...(a("accounts", "create") ? [{ href: "/owner/accounts/voucher?type=payment", label: "Voucher entry", icon: "Keyboard" as const }] : []), { href: "/owner/accounts/ledgers", label: "Chart of accounts", icon: "Library" }, { href: "/owner/accounts/outstanding", label: "Outstanding", icon: "Clock" }, { href: "/owner/accounts/bank", label: "Bank reconciliation", icon: "Landmark" }] : [] },
    { label: "Reports", items: a("accounts") ? [{ href: "/owner/accounts/reports", label: "Trial balance", icon: "Scale" }, { href: "/owner/accounts/pnl", label: "Profit & Loss", icon: "TrendingUp" }, { href: "/owner/accounts/balance-sheet", label: "Balance Sheet", icon: "Landmark" }, { href: "/owner/accounts/gst", label: "GST returns", icon: "ReceiptIndianRupee" }, { href: "/owner/accounts/edit-log", label: "Edit log", icon: "ShieldCheck" }, { href: "/owner/accounts/tally", label: "Tally sync", icon: "FileDown" }] : [] },
    { label: "People", items: [...(a("crm") ? [{ href: "/owner/parties?type=customer", label: "Customers", icon: "Users" as const }, { href: "/owner/offers", label: "Offers and targeting", icon: "Megaphone" as const }] : []), ...(a("purchase") ? [{ href: "/owner/parties?type=supplier", label: "Suppliers", icon: "Factory" as const }] : [])] },
    { label: "Admin", items: a("admin") ? [{ href: "/owner/team", label: "Team and roles", icon: "ShieldCheck" }, { href: "/owner/settings", label: "Settings", icon: "Settings" }, { href: "/owner/activity", label: "Activity", icon: "History" }] : [] },
  ] as NavGroup[]).filter((g) => g.items.length);
  const create = [
    ...(a("sales", "create") ? [{ href: "/owner/orders/new?kind=sale", label: "Sales order", icon: "FileText" as const }] : []),
    ...(a("purchase", "create") ? [{ href: "/owner/orders/new?kind=purchase", label: "Purchase order", icon: "ShoppingCart" as const }] : []),
    ...(a("inventory", "create") ? [{ href: "/owner/deliveries/new", label: "Dispatch or receipt", icon: "Truck" as const }] : []),
    ...(a("sales", "create") ? [{ href: "/owner/invoices/new?kind=sale", label: "Sales invoice", icon: "ReceiptIndianRupee" as const }] : []),
    ...(a("purchase", "create") ? [{ href: "/owner/invoices/new?kind=purchase", label: "Supplier bill", icon: "FileInput" as const }] : []),
    ...(a("accounts", "create") ? [{ href: "/owner/accounts/new?type=receipt", label: "Payment received", icon: "ArrowDownLeft" as const }, { href: "/owner/accounts/new?type=payment", label: "Payment made", icon: "ArrowUpRight" as const }, { href: "/owner/accounts/new?type=expense", label: "Expense", icon: "Wallet" as const }, { href: "/owner/accounts/voucher?type=credit_note", label: "Credit / debit note", icon: "FileInput" as const }, { href: "/owner/accounts/ledgers?new=1", label: "Ledger (Alt+C)", icon: "Library" as const }] : []),
    ...(a("crm", "create") ? [{ href: "/owner/parties/new?type=customer", label: "Customer", icon: "UserPlus" as const }] : []),
  ];
  const pages = [...groups.flatMap((g) => g.items.map((i) => ({ label: i.label, hint: g.label || "Home", href: i.href }))), ...(a("accounts", "edit") ? [{ label: "Import from Tally", hint: "Accounts", href: "/owner/accounts/import" }] : []), ...(a("accounts") ? [{ label: "Stock summary", hint: "Reports", href: "/owner/stock" }, { label: "Cash book", hint: "Reports", href: "/owner/accounts/ledgers?q=cash" }] : [])];
  const initials = me.profile.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="console-shell min-h-screen lg:flex"><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-s1 focus:p-4">Skip to workspace</a>
      <aside className="noprint sticky top-0 hidden h-screen w-[236px] shrink-0 overflow-y-auto border-r border-line bg-rail px-4 pb-6 pt-7 lg:block">
        <Link href="/owner" className="mb-7 flex items-center px-2" aria-label="Console home"><Logo tone="light" /></Link>
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-bg p-3"><Building2 size={18} className="text-pri"/><div><p className="text-xs font-semibold">B2All Trading</p><p className="mt-1 text-[10px] text-ink2">Raigarh · Trade workspace</p></div></div>
        <SideNav groups={groups} />
        <Link href="/" className="mt-6 flex items-center justify-between border-t border-line px-3 pt-5 text-xs text-ink2">Customer website<ArrowUpRight size={15}/></Link>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="noprint sticky top-0 z-20 flex h-[72px] items-center gap-2 border-b border-line bg-s1/95 px-3 backdrop-blur sm:px-6 lg:px-8">
          <MobileNav groups={groups} />
          <Breadcrumb groups={groups}/><form action="/owner/search" className="relative ml-auto max-w-sm flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink2" />
            <input name="q" placeholder="Search your workspace…" aria-label="Search" className="h-11 w-full rounded-lg border border-line bg-s1 pl-11 pr-4 text-[.8rem] outline-none placeholder:text-ink2 focus:border-ink focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--act)_55%,transparent)]" />
          </form>
          <div className="flex items-center gap-2">
            <Shortcuts pages={pages} accounts={a("accounts", "create")} />
            <CreateMenu items={create} />
            <ThemeToggle />
            <div className="group relative">
              <button className="grid size-11 place-items-center rounded-full bg-s2 text-sm font-semibold text-ink" aria-label={`Signed in as ${me.profile.name}`}>{initials}</button>
              <div className="invisible absolute right-0 z-40 mt-2 w-60 rounded-xl border border-line bg-s1 p-3 opacity-0 shadow-[var(--shadow)] transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="px-2 font-medium">{me.profile.name}</div><div className="px-2 text-sm text-ink2">{me.profile.role === "owner" ? "Owner" : me.role?.name}</div>
                <form action={signOut} className="mt-2"><button className="btn btn-text w-full !justify-start"><LogOut size={16} />Sign out</button></form>
              </div>
            </div>
          </div>
        </header>
        {!hasSupabase && <div className="noprint flex flex-wrap items-center justify-between gap-1 border-b border-line bg-pri-c px-4 py-2 text-[10px] text-on-pri-c sm:px-8"><span>Demo workspace · Sample business data</span><span>Explore safely. No live transactions.</span></div>}
        <main id="main-content" className="px-4 pb-16 pt-8 sm:px-6 lg:px-8"><InstallApp />{children}</main><footer className="noprint mx-8 flex flex-wrap justify-between gap-2 border-t border-line py-5 text-[10px] text-ink2"><span>B2All workspace · Built around your business</span><span>Raigarh, Chhattisgarh</span></footer>
      </div>
    </div>
  );
}
