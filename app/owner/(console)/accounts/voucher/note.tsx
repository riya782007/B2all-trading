"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { postNoteAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";

type Bill = { id: string; number: string; party_id: string; balance: number; date: string; gst_rate: number; taxable: number; qty: number; rate: number };
const REASONS = ["Rate difference", "Coal quality (GCV / ash)", "Shortage in weight", "Goods returned", "Discount allowed", "Other"];
const inr = (n: number) => (n < -0.004 ? "−₹" : "₹") + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Note({ kind, date, parties, bills, invoice, party }: { kind: "credit_note" | "debit_note"; date: string; parties: { id: string; name: string }[]; bills: Bill[]; invoice?: string; party?: string }) {
  const router = useRouter();
  const start = bills.find((b) => b.id === invoice);
  const [pid, setPid] = useState(start?.party_id ?? party ?? "");
  const [bid, setBid] = useState(start?.id ?? "");
  const [reason, setReason] = useState(REASONS[0]);
  const [taxable, setTaxable] = useState("");
  const [rate, setRate] = useState(String(start?.gst_rate ?? 18));
  const [st, act, pending] = useActionState<FormState, FormData>(postNoteAction, {});
  const [req] = useState(() => crypto.randomUUID());
  const form = useRef<HTMLFormElement>(null);
  const bill = bills.find((b) => b.id === bid);
  // coal lab report calculator
  const [q, setQ] = useState({ qty: String(start?.qty ?? ""), rate: String(start?.rate ?? ""), gc: "", ga: "", ac: "", aa: "", pen: "" });
  const N = (x: string) => Number(x) || 0;
  const newRate = N(q.gc) ? r2((N(q.rate) * N(q.ga)) / N(q.gc)) : 0;
  const gcvAdj = N(q.gc) && N(q.ga) ? r2((newRate - N(q.rate)) * N(q.qty)) : 0;
  const ashAdj = r2(-Math.max(0, N(q.aa) - N(q.ac)) * N(q.pen) * N(q.qty));
  const quality = r2(gcvAdj + ashAdj);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") { e.preventDefault(); form.current?.requestSubmit(); } if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) router.push("/owner/accounts"); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [router]);
  const tax = r2(N(taxable) * N(rate) / 100);
  const sale = kind === "credit_note";
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
      <form ref={form} action={act} className="card space-y-4 p-5 sm:p-6">
        <input type="hidden" name="kind" value={kind} /><input type="hidden" name="request_id" value={req} />
        <p className="text-sm text-ink2">{sale ? "Credit note: you reduce what a customer owes (rate difference, poor quality, shortage, return). Output GST is reversed and it shows in GSTR-1." : "Debit note: you reduce what you owe a supplier (rate difference, poor quality, shortage, return). Input GST is reversed."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span>Date</span><input name="date" type="date" defaultValue={date} className="input" required /></label>
          <label className="field"><span>{sale ? "Customer" : "Supplier"}</span><select name="party_id" value={pid} onChange={(e) => { setPid(e.target.value); setBid(""); }} className="input" required><option value="">Choose…</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="field sm:col-span-2"><span>Against bill (recommended)</span><select name="invoice_id" value={bid} onChange={(e) => { setBid(e.target.value); const b = bills.find((x) => x.id === e.target.value); if (b) { setRate(String(b.gst_rate)); setQ((x) => ({ ...x, qty: String(b.qty), rate: String(b.rate) })); } }} className="input"><option value="">Not against a specific bill</option>{bills.filter((b) => b.party_id === pid).map((b) => <option key={b.id} value={b.id}>{b.number} · {b.date} · balance {inr(b.balance)}</option>)}</select></label>
          <label className="field"><span>Reason</span><select name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input">{REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label className="field"><span>GST rate %</span><input name="gst_rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="input" /></label>
          <label className="field sm:col-span-2"><span>Amount before GST</span><input name="taxable" inputMode="decimal" value={taxable} onChange={(e) => setTaxable(e.target.value.replace(/[^\d.]/g, ""))} className="input text-lg tabular-nums" required /></label>
        </div>
        <div className="rounded-xl bg-s2 p-4 text-sm"><div className="flex justify-between"><span>Before GST</span><span className="tabular-nums">{inr(N(taxable))}</span></div><div className="flex justify-between"><span>GST {rate}% (split into CGST+SGST or IGST by state)</span><span className="tabular-nums">{inr(tax)}</span></div><div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold"><span>Note total</span><span className="tabular-nums">{inr(r2(N(taxable) + tax))}</span></div>{bill && N(taxable) + tax > bill.balance + 0.01 && <p className="mt-2 text-err">More than the bill balance of {inr(bill.balance)}. Choose a different bill or lower the amount.</p>}</div>
        <label className="field"><span>Narration</span><input name="narration" className="input" placeholder="Lab report no., weighbridge slip, return challan…" /></label>
        {st.error && <p role="alert" className="text-sm font-medium text-err">{st.error}</p>}
        <button className="btn btn-filled btn-lg" disabled={pending || !pid || !(N(taxable) > 0)}>{pending ? "Saving…" : `Accept ${sale ? "credit" : "debit"} note (Ctrl+A)`}</button>
      </form>
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2 font-medium"><FlaskConical size={18} className="text-pri" />Coal quality calculator</div>
        <p className="text-xs text-ink2">Enter the contract and lab values. Price moves pro-rata with GCV, and each % of ash above the guarantee is charged at your penalty rate.</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {([["qty", "Quantity (MT)"], ["rate", "Contract rate ₹/MT"], ["gc", "Contract GCV"], ["ga", "Lab GCV"], ["ac", "Ash guaranteed %"], ["aa", "Ash in lab %"], ["pen", "Penalty ₹/MT per 1% ash"]] as const).map(([k, l]) => <label key={k} className={`field ${k === "pen" ? "col-span-2" : ""}`}><span className="text-xs">{l}</span><input inputMode="decimal" value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value.replace(/[^\d.]/g, "") })} className="input !py-1.5" /></label>)}
        </div>
        <div className="rounded-xl bg-s2 p-3 text-sm">{N(q.gc) > 0 && N(q.ga) > 0 ? <>
          <div className="flex justify-between"><span>Adjusted rate</span><span className="tabular-nums">{inr(newRate)}/MT</span></div>
          <div className="flex justify-between"><span>GCV adjustment</span><span className="tabular-nums">{inr(gcvAdj)}</span></div>
          <div className="flex justify-between"><span>Ash penalty</span><span className="tabular-nums">{inr(ashAdj)}</span></div>
          <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold"><span>{quality < 0 ? "Price to reduce" : "Bonus due"}</span><span className="tabular-nums">{inr(Math.abs(quality))}</span></div></> : <span className="text-ink2">Fill in both GCV values.</span>}</div>
        {quality < 0 && <button type="button" className="btn btn-tonal w-full" onClick={() => { setTaxable(String(Math.abs(quality))); setReason("Coal quality (GCV / ash)"); }}>Use {inr(Math.abs(quality))} in this note</button>}
        {quality > 0 && <p className="text-xs text-ink2">A quality bonus is the other way round: {sale ? "raise a supplementary invoice to the customer" : "the supplier raises a debit on you"}.</p>}
      </div>
    </div>
  );
}
