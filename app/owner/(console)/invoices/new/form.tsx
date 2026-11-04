"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, ReceiptIndianRupee, ArrowRight } from "lucide-react";
import { createInvoiceAction, type FormState } from "@/app/actions";
import { gstSplit, moneyProduct, inr, num, today } from "@/lib/money";
type O = { id: string; label: string; rate: number; unit: string; gst: number; ordered: number; billed: number; dels: { id: string; label: string; qty: number }[] };
export default function InvoiceForm({ kind, orders, initial, requestId }: { kind: "sale" | "purchase"; orders: O[]; initial?: string; requestId: string }) {
  const [s, act, pending] = useActionState<FormState, FormData>(createInvoiceAction, {});
  const [oid, setOid] = useState(initial && orders.some((o) => o.id === initial) ? initial : orders[0]?.id);
  const o = orders.find((x) => x.id === oid);
  const [picked, setPicked] = useState<Record<string, string>>(Object.fromEntries(o?.dels.map((d) => [d.id, String(d.qty)]) ?? []));
  const [rate, setRate] = useState("");
  const [billTotal, setBillTotal] = useState("");
  const [review, setReview] = useState(false);
  if (!orders.length) return <div className="card p-8 text-center"><Check className="mx-auto mb-3 text-ok" /><h2 className="text-xl">Everything received is billed</h2><p className="mt-2 text-ink2">Record the next receipt or dispatch when it arrives.</p><Link href="/owner/matching" className="btn btn-outline mt-5">Back to matching</Link></div>;
  const selected = o?.dels.filter((d) => picked[d.id] !== undefined) ?? [];
  const qty = selected.reduce((t, d) => t + Number(picked[d.id]), 0);
  const r = rate.trim() === "" ? o?.rate ?? 0 : Number(rate);
  const valid = Number.isFinite(r) && r > 0 && selected.length > 0 && selected.every((d) => Number.isFinite(Number(picked[d.id])) && Number(picked[d.id]) > 0 && Number(picked[d.id]) <= d.qty);
  const taxable = valid ? moneyProduct(qty, r) : 0;
  const total = valid ? gstSplit(taxable, o?.gst ?? 0, false).total : 0;
  return <form action={act} className="grid items-start gap-6 xl:grid-cols-[1fr_320px]" onChange={() => setReview(false)}>
    <input type="hidden" name="request_id" value={requestId} />
    <div className="card space-y-6 p-5 sm:p-7">
      <div className="flex items-center gap-3 border-b border-line pb-5"><span className="grid size-10 place-items-center rounded-xl bg-pri-c text-pri"><ReceiptIndianRupee size={20} /></span><div><h2 className="text-lg">Match what this bill covers</h2><p className="text-sm text-ink2">One receipt can be billed in parts.</p></div></div>
      <label className="field"><span>Order &amp; party</span><select name="order_id" value={oid} onChange={(e) => { setOid(e.target.value); setRate(""); setBillTotal(""); setPicked(Object.fromEntries(orders.find((x) => x.id === e.target.value)?.dels.map((d) => [d.id, String(d.qty)]) ?? [])); }} className="input">{orders.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "purchase" && <label className="field"><span>Supplier bill number</span><input name="supplier_bill_no" required maxLength={100} className="input" placeholder="As printed on the bill" /></label>}
        <label className="field"><span>Bill date</span><input name="date" required type="date" defaultValue={today()} className="input" /></label>
      </div>
      <fieldset><legend className="mb-3 font-semibold">{kind === "sale" ? "Dispatches" : "Receipts"} covered</legend><div className="space-y-3">{o?.dels.map((d) => <div key={d.id} className={`rounded-xl border p-4 ${picked[d.id] !== undefined ? "border-pri/40 bg-pri-c/20" : "border-line"}`}><label className="flex items-start gap-3"><input type="checkbox" name="delivery_id" value={d.id} checked={picked[d.id] !== undefined} onChange={() => { const p = { ...picked }; if (p[d.id] !== undefined) delete p[d.id]; else p[d.id] = String(d.qty); setPicked(p); }} className="mt-1 size-5 accent-[var(--pri)]" /><span className="min-w-0 flex-1 text-sm font-medium">{d.label}<span className="mt-1 block font-normal text-ink2">{num(d.qty)} {o.unit} still to bill</span></span></label>{picked[d.id] !== undefined && <label className="field ml-8 mt-3"><span>Quantity on this bill ({o.unit})</span><input name={`qty_${d.id}`} type="number" step="0.001" min="0.001" max={d.qty} required value={picked[d.id]} onChange={(e) => setPicked({ ...picked, [d.id]: e.target.value })} className="input max-w-48" /></label>}</div>)}</div></fieldset>
      {kind === "purchase" && <label className="field"><span>Printed bill total, including GST (₹)</span><input name="bill_total" type="number" min="0.01" step="0.01" required value={billTotal} onChange={(e) => setBillTotal(e.target.value)} className="input" placeholder="Check against the supplier document"/></label>}
      <label className="field"><span>Rate per {o?.unit} · order rate {inr(o?.rate ?? 0, 2)}</span><input name="rate" type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={String(o?.rate)} className="input" /></label>
    </div>
    <aside className="card space-y-5 p-6 xl:sticky xl:top-24">
      <h2 className="text-lg">Bill summary</h2><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-ink2">Quantity</span><b>{Number.isFinite(qty) ? num(qty) : "—"} {o?.unit}</b></div><div className="flex justify-between"><span className="text-ink2">Taxable value</span><span>{inr(taxable,2)}</span></div><div className="flex justify-between"><span className="text-ink2">GST · {o?.gst}%</span><span>{inr(total-taxable,2)}</span></div><div className="border-t border-line pt-4"><span className="text-ink2">Total to post</span><div className="mt-1 text-3xl font-semibold tracking-tight">{inr(total,2)}</div></div></div>
      {rate !== "" && r !== o?.rate && <p className="rounded-lg bg-ter-c p-3 text-sm text-on-ter-c">Rate changed from {inr(o?.rate ?? 0,2)}. Check against the supplier bill.</p>}
      <p className="text-xs text-ink2">GST split uses the saved party state. Posting creates the bill and balanced accounts together.</p>
      {billTotal && Math.abs(Number(billTotal)-total)>0.010001 && <p role="alert" className="rounded-lg bg-err-c p-3 text-sm text-on-err-c">Printed total differs by {inr(Number(billTotal)-total,2)}. Check rate, quantity, GST and extra charges before posting.</p>}
      {s.error && <p role="alert" className="rounded-lg bg-err-c p-3 text-sm text-on-err-c">{s.error}</p>}
      {review ? <><p className="text-sm text-ok">Ready to post {selected.length} matched receipt{selected.length === 1 ? "" : "s"}. Check the total above.</p><button className="btn btn-filled w-full" disabled={pending || !valid}>{pending ? "Posting…" : "Confirm & post bill"}<Check size={17} /></button><button type="button" onClick={() => setReview(false)} className="btn btn-text w-full">Go back</button></> : <button type="button" onClick={(e) => { if (e.currentTarget.form?.reportValidity()) setReview(true); }} className="btn btn-filled w-full" disabled={!valid || (kind === "purchase" && (!billTotal || Math.abs(Number(billTotal)-total)>0.010001))}>Review bill<ArrowRight size={17} /></button>}
    </aside>
  </form>;
}
