import Link from "next/link";
import { Search } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews, orderViews } from "@/lib/domain";
import { inr, num, sdate } from "@/lib/money";
import { Empty, Page, Section } from "@/components/ui";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = (await staff())!; const q = ((await searchParams).q ?? "").trim(); const Q = q.toUpperCase(); const V = Q.replace(/[\s-]/g, "");
  const s = await getStore();
  const [parties, ov, inv] = await Promise.all([s.all("parties"), orderViews(s), invoiceViews(s)]);
  const P = q ? parties.filter((p) => `${p.name} ${p.city} ${p.phone} ${p.gstin}`.toUpperCase().includes(Q) && allowed(me, p.type === "customer" ? "crm" : "purchase")) : [];
  const O = q ? ov.filter((o) => (o.number.toUpperCase().includes(Q) || o.party.name.toUpperCase().includes(Q) || o.material.name.toUpperCase().includes(Q)) && allowed(me, o.kind === "sale" ? "sales" : "purchase")) : [];
  const I = q ? inv.filter((i) => (i.number.toUpperCase().includes(Q) || i.party.name.toUpperCase().includes(Q)) && allowed(me, i.kind === "sale" ? "sales" : "purchase")) : [];
  const D = q && allowed(me, "inventory") ? ov.flatMap((o) => o.deliveries.map((d) => ({ d, o }))).filter(({ d }) => d.vehicle_no.includes(V) || d.bill_no.toUpperCase().includes(Q) || (d.eway_no ?? "").includes(q)) : [];
  const none = !P.length && !O.length && !I.length && !D.length;
  return (
    <Page title={q ? `“${q}”` : "Search"}>
      {!q || none ? <Empty icon={Search} title={q ? "Nothing matches" : "Type in the search bar above"}>Search by customer, supplier, order, invoice, bill number, vehicle number or e-way bill.</Empty> : <>
        {P.length > 0 && <Section title="People">{<div className="card divide-y divide-line">{P.map((p) => <Link key={p.id} href={`/owner/parties/${p.id}`} className="flex justify-between px-5 py-3 hover:bg-s2"><span className="font-medium">{p.name}</span><span className="text-ink2">{p.type} · {p.city}</span></Link>)}</div>}</Section>}
        {O.length > 0 && <Section title="Orders"><div className="card divide-y divide-line">{O.map((o) => <Link key={o.id} href={`/owner/orders/${o.id}`} className="flex justify-between px-5 py-3 hover:bg-s2"><span className="font-medium">{o.number}</span><span className="text-ink2">{o.party.name} · {num(o.qty)} {o.material.unit} {o.material.name}</span></Link>)}</div></Section>}
        {I.length > 0 && <Section title="Invoices and bills"><div className="card divide-y divide-line">{I.map((i) => <Link key={i.id} href={`/owner/invoices/${i.id}`} className="flex justify-between px-5 py-3 hover:bg-s2"><span className="font-medium">{i.number}</span><span className="text-ink2">{i.party.name} · {inr(i.total)}</span></Link>)}</div></Section>}
        {D.length > 0 && <Section title="Trucks"><div className="card divide-y divide-line">{D.map(({ d, o }) => <Link key={d.id} href={`/owner/orders/${o.id}`} className="flex justify-between px-5 py-3 hover:bg-s2"><span className="font-medium">{d.vehicle_no} · {d.bill_no}</span><span className="text-ink2">{num(d.qty)} {o.material.unit} · {o.number} · {sdate(d.bill_date)}</span></Link>)}</div></Section>}
      </>}
    </Page>
  );
}
