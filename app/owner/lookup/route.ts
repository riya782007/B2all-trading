import { NextResponse } from "next/server";
import { getMe, isStaff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
/** Data for the Go To box (Alt+G): ledgers, customers, suppliers, invoices and orders the person may see. */
export async function GET() {
  const me = await getMe(); if (!isStaff(me)) return NextResponse.json([], { status: 403 });
  const s = await getStore(); const out: { label: string; hint: string; href: string }[] = [];
  const [ls, ps, inv, ord] = await Promise.all([allowed(me, "accounts") ? s.all("ledgers") : [], allowed(me, "crm") || allowed(me, "purchase") ? s.all("parties") : [], allowed(me, "sales") || allowed(me, "purchase") ? s.all("invoices") : [], allowed(me, "sales") || allowed(me, "purchase") ? s.all("orders") : []]);
  ls.forEach((l) => out.push({ label: l.name, hint: `Ledger · ${l.grp}`, href: `/owner/accounts/ledgers/${l.id}` }));
  ps.forEach((p) => out.push({ label: p.name, hint: p.type === "customer" ? "Customer" : "Supplier", href: `/owner/parties/${p.id}` }));
  inv.forEach((i) => out.push({ label: i.number, hint: i.kind === "sale" ? "Sales invoice" : "Supplier bill", href: `/owner/invoices/${i.id}` }));
  ord.forEach((o) => out.push({ label: o.number, hint: o.kind === "sale" ? "Sales order" : "Purchase order", href: `/owner/orders/${o.id}` }));
  return NextResponse.json(out, { headers: { "cache-control": "private, max-age=30" } });
}
