import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { orderViews } from "@/lib/domain";
import { num, sdate } from "@/lib/money";
import { Chip, Denied, Empty, Filters, Page } from "@/components/ui";

export default async function Deliveries({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const me = await staff("inventory"); if (!me) return <Denied />;
  const { q = "", kind = "all" } = await searchParams;
  const f = q.replace(/[\s-]/g, "").toUpperCase();
  const rows = (await orderViews(await getStore())).filter((o) => kind === "all" || o.kind === kind).flatMap((o) => o.deliveries.map((d) => ({ d, o })))
    .filter(({ d, o }) => !q || d.vehicle_no.includes(f) || d.bill_no.toUpperCase().includes(q.toUpperCase()) || o.party.name.toUpperCase().includes(q.toUpperCase()) || o.number.toUpperCase().includes(q.toUpperCase()))
    .sort((a, b) => b.d.bill_date.localeCompare(a.d.bill_date));
  const vehicles = new Map<string, { n: number; qty: number }>(); rows.forEach(({ d }) => { const v = vehicles.get(d.vehicle_no) ?? { n: 0, qty: 0 }; v.n++; v.qty += Number(d.qty); vehicles.set(d.vehicle_no, v); });
  return (
    <Page title="Dispatch and receipts" sub="Every truck in and out, with its bill, vehicle and e-way bill. Search a vehicle to see its full history." actions={allowed(me, "inventory", "create") && <Link href="/owner/deliveries/new" className="btn btn-filled"><Plus size={18} />Record</Link>}>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Vehicle number, bill number, party or order" className="input max-w-lg" aria-label="Search" /><input type="hidden" name="kind" value={kind} /><button className="btn btn-tonal">Search</button></form>
      <Filters current={kind} items={[["all", "All"], ["sale", "Dispatches"], ["purchase", "Receipts"]].map(([k, l]) => ({ key: k, label: l, href: `/owner/deliveries?kind=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}` }))} />
      {vehicles.size > 1 && <div className="mb-4 flex flex-wrap gap-2">{[...vehicles].sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([v, c]) => <Link key={v} href={`/owner/deliveries?q=${v}`} className="chip chip-grey !h-8 !text-sm">{v} · {c.n} trips · {num(c.qty)}</Link>)}</div>}
      {!rows.length ? <Empty icon={Truck} title="Nothing found" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[760px]"><thead><tr><th>Date</th><th>Type</th><th>Bill</th><th>Vehicle</th><th>Order</th><th>Party</th><th className="num">Qty</th><th>Billed</th></tr></thead><tbody>
          {rows.map(({ d, o }) => <tr key={d.id}><td>{sdate(d.bill_date)}</td><td><Chip tone={o.kind === "sale" ? "green" : "blue"}>{o.kind === "sale" ? "Out" : "In"}</Chip></td><td className="font-medium">{d.bill_no}</td><td><Link href={`/owner/deliveries?q=${d.vehicle_no}`} className="hover:underline">{d.vehicle_no}</Link></td><td><Link href={`/owner/orders/${o.id}`} className="text-pri hover:underline">{o.number}</Link></td><td>{o.party.name}</td><td className="num">{num(d.qty)} {o.material.unit}</td><td>{d.invoice_id ? <Chip tone="green">Yes</Chip> : <Chip tone="amber">No</Chip>}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
