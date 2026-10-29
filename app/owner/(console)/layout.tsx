import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/store";
import InstallApp from "@/components/InstallApp";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/owner-manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "B2All", statusBarStyle: "default" },
  icons: { apple: "/pwa-icon/180" },
};
export const viewport: Viewport = { themeColor: "#163e32" };

const NAV = [["/owner", "Today"], ["/owner/enquiries", "Enquiries"], ["/owner/customers", "Customers"], ["/owner/offers", "Offers"]];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u || u.role !== "owner") redirect("/owner/login");
  return (
    <div className="mx-auto min-h-screen max-w-5xl md:flex">
      <aside className="hidden w-52 shrink-0 border-r border-line p-5 md:block">
        <span className="font-display text-xl font-semibold text-brand">B2All</span>
        <div className="mt-1 text-xs text-muted">Owner console</div>
        <nav className="mt-8 space-y-1">{NAV.map(([h, l]) => <Link key={h} href={h} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-soft">{l}</Link>)}</nav>
      </aside>
      <main className="flex-1 px-4 pb-28 pt-6 md:pb-10"><InstallApp />{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-card md:hidden">
        {NAV.map(([h, l]) => <Link key={h} href={h} className="py-4 text-center text-sm font-semibold">{l}</Link>)}
      </nav>
    </div>
  );
}
