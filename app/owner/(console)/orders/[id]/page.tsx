import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, ReceiptIndianRupee, FileSignature } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { orderView } from "@/lib/domain";
import { ewayStatus } from "@/lib/eway";
import { fdate, inr, num, sdate } from "@/lib/money";
import { Bar, Chip, Denied, Notice, Page, Section } from "@/components/ui";
import { draftContractAction, setOrderStatusAction } from "@/app/actions";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params; const { saved } = await searchParams;
  const s = await getStore(); const o = await orderView(s, id); if (!o) notFound();
  const mod = o.kind === "sale" ? "sales" : "purchase";
  const me = await staff(mod); if (!me) return <Denied />;
  const [invs, contracts] = await Promise.all([s.all("invoices", { order_id: o.id }), s.all("contracts", { order_id: o.id })]);
  const contract = contracts.find((c) => c.status !== "cancelled");
  const u = o.material.unit;
  return (
    <Page title={o.number} sub={<>{o.party.name} · {o.material.name} · {inr(o.rate)}/{u} · {fdate(o.date)}</>} back={{ href: `/owner/orders?kind=${o.kind}`, label: o.kind === "sale" ? "Sales orders" : "Purchase orders" }}
      actions={<>
        {o.status === "open" && allowed(me, "inventory", "create") && <Link href={`/owner/deliveries/new?order=${o.id}`} className="btn btn-filled"><Truck size={18} />{o.kind === "sale" ? "Record dispatch" : "Record receipt"}</Link>}
        {o.unbilled > 0 && allowed(me, mod, "create") && <Link href={`/owner/invoices/new?kind=${o.kind}&order=${o.id}`} className="btn btn-tonal"><ReceiptIndianRupee size={18} />{o.kind === "sale" ? "Raise invoice" : "Enter supplier bill"}</Link>}
      </>}>
      {saved && <Notice>Saved. The balance below is updated.</Notice>}
      <div className="card p-6">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[["Ordered", o.qty, ""], [o.kind === "sale" ? "Dispatched" : "Received", o.received, "text-pri"], [o.over ? "Over ordered" : "Pending", o.over || o.pending, o.over ? "text-err" : "text-ter"], ["Billed", o.billed, ""]].map(([l, v, c]) => <div key={l as string}><div className="text-sm text-ink2">{l}</div><div className={`display text-3xl font-medium ${c}`}>{num(v as number)}</div><div className="text-xs text-ink2">{u}</div></div>)}
        </div>
        <div className="mt-5"><Bar pct={o.pct} tone={o.over ? "err" : "pri"} /></div>
        {o.unbilled > 0 && <p className="mt-3 text-sm text-ter">{num(o.unbilled)} {u} {o.kind === "sale" ? "dispatched" : "received"} but not billed yet.</p>}
        {o.unbilled < 0 && <p className="mt-3 text-sm text-err">Billed {num(-o.unbilled)} {u} more than {o.kind === "sale" ? "dispatched" : "received"}. Check the bills.</p>}
      </div>

      <Section title={`${o.kind === "sale" ? "Dispatches" : "Receipts"} against this order · ${o.deliveries.length}`}>
        {!o.deliveries.length ? <p className="card-tonal p-5 text-ink2">Nothing yet. Each truck you record shows here with a running total.</p> : (
          <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr><th>Bill / challan</th><th>Date</th><th>Vehicle</th><th className="num">Qty</th><th className="num">Running total</th><th>E-way bill</th><th>Billed</th></tr></thead><tbody>
            {o.deliveries.map((d) => { const st = ewayStatus(d.eway_valid_till); return <tr key={d.id}><td className="font-medium">{d.bill_no}</td><td>{sdate(d.bill_date)}</td><td>{d.vehicle_no}</td><td className="num">{num(d.qty)}</td><td className={`num font-medium ${d.running > o.qty ? "text-err" : ""}`}>{num(d.running)} / {num(o.qty)}</td><td>{d.eway_no ? <span className="flex items-center gap-2"><span className="text-sm">{d.eway_no}</span><Chip tone={st.tone}>{st.label}</Chip></span> : <span className="text-ink2">-</span>}</td><td>{d.invoice_id ? <Chip tone="green">Yes</Chip> : <Chip tone="amber">No</Chip>}</td></tr>; })}
          </tbody></table></div>)}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Invoices">{invs.length ? <div className="card divide-y divide-line">{invs.map((i) => <Link key={i.id} href={`/owner/invoices/${i.id}`} className="flex justify-between px-5 py-3 hover:bg-s2"><span className="font-medium">{i.number}</span><span className="text-ink2">{num(i.qty)} {u} · {inr(i.total)}</span></Link>)}</div> : <p className="card-tonal p-5 text-ink2">No invoices yet.</p>}</Section>
        {o.kind === "sale" && <Section title="Contract">{contract ? <Link href={`/owner/contracts/${contract.id}`} className="card flex items-center justify-between p-5 hover:bg-s2"><span className="flex items-center gap-3"><FileSignature size={18} />{contract.number}</span><Chip tone={contract.status === "signed" ? "green" : contract.status === "sent" ? "amber" : "blue"}>{contract.status === "signed" ? "Signed" : contract.status === "sent" ? "Awaiting signature" : "Draft"}</Chip></Link> : allowed(me, "sales", "create") ? <form action={draftContractAction.bind(null, o.id)}><button className="btn btn-tonal">Prepare contract</button></form> : null}</Section>}
      </div>

      {allowed(me, mod, "edit") && <Section title="Order status">
        {o.status === "open" ? <form action={setOrderStatusAction.bind(null, o.id, "closed")} className="flex flex-wrap gap-2"><input name="note" className="input max-w-sm" placeholder={o.pending ? `Reason for closing ${num(o.pending)} ${u} short` : "Note (optional)"} /><button className="btn btn-outline">Close order</button></form>
          : <form action={setOrderStatusAction.bind(null, o.id, "open")} className="flex items-center gap-3"><span className="text-ink2">Closed{o.closed_note ? `: ${o.closed_note}` : ""}</span><button className="btn btn-outline">Reopen</button></form>}
      </Section>}
    </Page>
  );
}
