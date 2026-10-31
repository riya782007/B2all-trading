"use client";
import { useActionState, useState } from "react";
import { saveDelivery, type FormState } from "@/app/actions";
type O = { id: string; label: string; kind: string; unit: string; qty: number; received: number; rate: number };
const n = (x: number) => x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
export default function DeliveryForm({ orders, initial }: { orders: O[]; initial?: string }) {
  const [s, act, pending] = useActionState<FormState, FormData>(saveDelivery, {});
  const v = s.values ?? {};
  const [oid, setOid] = useState(v.order_id || initial || orders[0]?.id || ""); const [qty, setQty] = useState(v.qty ?? "");
  const o = orders.find((x) => x.id === oid); const q = Number(qty) || 0; const after = (o?.received ?? 0) + q; const over = o ? after > o.qty : false;
  if (!orders.length) return <p className="card-tonal p-5">There are no open orders. Create a sales or purchase order first.</p>;
  return (
    <form action={act} className="card grid gap-4 p-6 sm:grid-cols-2">
      <label className="field sm:col-span-2"><span>Order</span><select name="order_id" value={oid} onChange={(e) => setOid(e.target.value)} className="input">{orders.map((x) => <option key={x.id} value={x.id}>{x.kind === "sale" ? "Dispatch · " : "Receipt · "}{x.label}</option>)}</select>{o && <span className="mt-1 !text-sm">{n(o.received)} of {n(o.qty)} {o.unit} so far</span>}</label>
      <label className="field"><span>Bill or challan number</span><input name="bill_no" defaultValue={v.bill_no} required className="input" /></label>
      <label className="field"><span>Date on the bill</span><input name="bill_date" type="date" defaultValue={v.bill_date || new Date().toISOString().slice(0, 10)} required className="input" /></label>
      <label className="field"><span>Vehicle number</span><input name="vehicle_no" defaultValue={v.vehicle_no} placeholder="CG04AB1234" required className="input uppercase" autoCapitalize="characters" /></label>
      <label className="field"><span>Quantity ({o?.unit})</span><input name="qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} required className="input" /></label>
      <label className="field"><span>E-way bill number</span><input name="eway_no" defaultValue={v.eway_no} inputMode="numeric" className="input" /></label>
      <label className="field"><span>E-way bill valid till</span><input name="eway_valid_till" type="date" defaultValue={v.eway_valid_till} className="input" /></label>
      <label className="field sm:col-span-2"><span>Note (optional)</span><input name="note" defaultValue={v.note} className="input" /></label>
      {o && q > 0 && <div className={`rounded-2xl p-4 sm:col-span-2 ${over ? "bg-err-c text-on-err-c" : "bg-pri-c text-on-pri-c"}`}><div className="text-sm opacity-80">After this {o.kind === "sale" ? "dispatch" : "receipt"}</div><div className="display text-2xl font-medium">{n(after)} of {n(o.qty)} {o.unit}</div><div className="text-sm font-medium">{over ? `${n(after - o.qty)} more than ordered` : `${n(o.qty - after)} still pending`} · value ₹{n(Math.round(q * o.rate))}</div></div>}
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}
      {s.warnings && <div role="alert" className="rounded-2xl bg-ter-c p-4 text-on-ter-c sm:col-span-2"><div className="font-medium">Please check before saving</div><ul className="mt-1 list-disc pl-5 text-sm">{s.warnings.map((w) => <li key={w}>{w}</li>)}</ul><label className="mt-3 flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="confirm" value="yes" className="size-5" />I have checked. Save anyway.</label></div>}
      <button className="btn btn-filled btn-lg sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
