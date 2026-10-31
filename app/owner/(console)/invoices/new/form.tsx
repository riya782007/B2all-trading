"use client";
import { useActionState, useState } from "react";
import { createInvoiceAction, type FormState } from "@/app/actions";
type O = { id: string; label: string; rate: number; unit: string; gst: number; ordered: number; billed: number; dels: { id: string; label: string; qty: number }[] };
const n = (x: number) => x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
export default function InvoiceForm({ kind, orders, initial }: { kind: "sale" | "purchase"; orders: O[]; initial?: string }) {
  const [s, act, pending] = useActionState<FormState, FormData>(createInvoiceAction, {});
  const [oid, setOid] = useState(initial && orders.some((o) => o.id === initial) ? initial : orders[0]?.id);
  const o = orders.find((x) => x.id === oid);
  const [picked, setPicked] = useState<Set<string>>(new Set(o?.dels.map((d) => d.id)));
  const [rate, setRate] = useState("");
  if (!orders.length) return <p className="card-tonal p-5">Nothing to bill. Every {kind === "sale" ? "dispatch" : "receipt"} already has a {kind === "sale" ? "invoice" : "bill"}.</p>;
  const qty = o ? o.dels.filter((d) => picked.has(d.id)).reduce((t, d) => t + d.qty, 0) : 0;
  const r = Number(rate) || o?.rate || 0; const taxable = qty * r; const tax = (taxable * (o?.gst ?? 0)) / 100;
  const overBilled = o ? o.billed + qty > o.ordered : false;
  return (
    <form action={act} className="card grid gap-4 p-6">
      <label className="field"><span>Order</span><select name="order_id" value={oid} onChange={(e) => { setOid(e.target.value); setPicked(new Set(orders.find((x) => x.id === e.target.value)?.dels.map((d) => d.id))); }} className="input">{orders.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <fieldset><legend className="mb-2 text-sm font-medium text-ink2">{kind === "sale" ? "Dispatches to bill" : "Receipts on this bill"}</legend><div className="space-y-2">{o?.dels.map((d) => <label key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3"><input type="checkbox" name="delivery_id" value={d.id} checked={picked.has(d.id)} onChange={() => { const p = new Set(picked); p.has(d.id) ? p.delete(d.id) : p.add(d.id); setPicked(p); }} className="size-5 accent-[var(--pri)]" /><span className="flex-1 text-sm">{d.label}</span><span className="font-medium">{n(d.qty)} {o.unit}</span></label>)}</div></fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        {kind === "purchase" && <label className="field"><span>Supplier's bill number</span><input name="supplier_bill_no" required className="input" /></label>}
        <label className="field"><span>Date</span><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></label>
        <label className="field"><span>Rate (blank = order rate ₹{n(o?.rate ?? 0)})</span><input name="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="input" /></label>
      </div>
      {qty > 0 && <div className="card-tonal p-4"><div className="text-sm text-ink2">{n(qty)} {o?.unit} × ₹{n(r)}</div><div className="display text-2xl font-medium">₹{n(Math.round((taxable + tax) * 100) / 100)}</div><div className="text-sm text-ink2">₹{n(taxable)} + GST {o?.gst}% (split worked out from the party's state)</div>{rate && Number(rate) !== o?.rate && <div className="mt-1 text-sm text-ter">Rate differs from the order rate of ₹{n(o?.rate ?? 0)}.</div>}{overBilled && <div className="mt-1 text-sm text-err">Total billed will exceed the ordered {n(o!.ordered)} {o!.unit}.</div>}</div>}
      {s.error && <p role="alert" className="text-sm font-medium text-err">{s.error}</p>}
      <button className="btn btn-filled btn-lg" disabled={pending || !qty}>{pending ? "Saving…" : kind === "sale" ? "Create invoice" : "Save bill"}</button>
    </form>
  );
}
