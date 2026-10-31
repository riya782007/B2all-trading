"use client";
import { useActionState, useState } from "react";
import { createOrderAction, type FormState } from "@/app/actions";

type P = { id: string; name: string; state: string }; type M = { id: string; name: string; unit: string; gst: number };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
export default function OrderForm({ kind, parties, materials, home, preset }: { kind: "sale" | "purchase"; parties: P[]; materials: M[]; home: string; preset?: string }) {
  const [s, act, pending] = useActionState<FormState, FormData>(createOrderAction, {});
  const [pid, setPid] = useState(preset && parties.some((p) => p.id === preset) ? preset : parties[0]?.id);
  const [mid, setMid] = useState(materials[0]?.id); const [qty, setQty] = useState(""); const [rate, setRate] = useState("");
  const m = materials.find((x) => x.id === mid); const p = parties.find((x) => x.id === pid);
  const taxable = (Number(qty) || 0) * (Number(rate) || 0); const tax = (taxable * (m?.gst ?? 0)) / 100;
  return (
    <form action={act} className="card grid gap-4 p-6 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      <label className="field sm:col-span-2"><span>{kind === "sale" ? "Customer" : "Supplier"}</span><select name="party_id" value={pid} onChange={(e) => setPid(e.target.value)} className="input">{parties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="field"><span>Material</span><select name="material_id" value={mid} onChange={(e) => setMid(e.target.value)} className="input">{materials.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="field"><span>{kind === "sale" ? "Customer's PO number (optional)" : "PO number (leave blank to auto-number)"}</span><input name="number" className="input" placeholder="Auto" /></label>
      <label className="field"><span>Quantity ({m?.unit})</span><input name="qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} required className="input" /></label>
      <label className="field"><span>Rate per {m?.unit} (₹, before GST)</span><input name="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required className="input" /></label>
      <label className="field"><span>Date</span><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></label>
      <label className="field"><span>Delivery and other terms</span><input name="terms" className="input" placeholder="e.g. Ex-works Raigarh" /></label>
      {taxable > 0 && <div className="card-tonal p-4 sm:col-span-2"><div className="text-sm text-ink2">Order value</div><div className="display text-2xl font-medium">{inr(taxable + tax)}</div><div className="text-sm text-ink2">{inr(taxable)} + GST {m?.gst}% {p && p.state !== home ? "(IGST, other state)" : "(CGST + SGST)"}</div></div>}
      {kind === "sale" && <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="contract" defaultChecked className="size-5 accent-[var(--pri)]" />Prepare the contract for e-signing</label>}
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}
      <button className="btn btn-filled btn-lg sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Create order"}</button>
    </form>
  );
}
