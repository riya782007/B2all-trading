"use client";
import { useActionState, useState } from "react";
import { moneyAction, type FormState } from "@/app/actions";
type I = { id: string; party: string; label: string; balance: number };
export default function MoneyForm({ type, parties, invoices, expenseLedgers, preset }: { type: "receipt" | "payment" | "expense"; parties: { id: string; name: string }[]; invoices: I[]; expenseLedgers: string[]; preset: { party?: string; invoice?: string; amount?: string } }) {
  const [s, act, pending] = useActionState<FormState, FormData>(moneyAction, {});
  const [party, setParty] = useState(preset.party ?? parties[0]?.id ?? "");
  const [invoice, setInvoice] = useState(preset.invoice ?? "");
  const [amount, setAmount] = useState(preset.amount ?? "");
  const mine = invoices.filter((i) => i.party === party);
  return (
    <form action={act} className="card grid gap-4 p-6">
      <input type="hidden" name="type" value={type} />
      {type === "expense" ? (<>
        <label className="field"><span>Expense head</span><select name="ledger" className="input">{expenseLedgers.map((l) => <option key={l}>{l}</option>)}</select></label>
        <label className="field"><span>What was it for?</span><input name="narration" required className="input" placeholder="e.g. Freight for DC-519" /></label>
      </>) : (<>
        <label className="field"><span>{type === "receipt" ? "Received from" : "Paid to"}</span><select name="party_id" value={party} onChange={(e) => { setParty(e.target.value); setInvoice(""); }} className="input">{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="field"><span>Against {type === "receipt" ? "invoice" : "bill"} (optional)</span><select name="invoice_id" value={invoice} onChange={(e) => { setInvoice(e.target.value); const b = mine.find((i) => i.id === e.target.value)?.balance; if (b) setAmount(String(b)); }} className="input"><option value="">On account (no specific bill)</option>{mine.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
      </>)}
      <div className="grid grid-cols-2 gap-4">
        <label className="field"><span>Amount (₹)</span><input name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input text-lg font-medium" /></label>
        <label className="field"><span>Date</span><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></label>
      </div>
      <fieldset className="grid grid-cols-2 gap-2">{["Bank", "Cash"].map((m, i) => <label key={m} className="cursor-pointer rounded-2xl border border-line p-3 text-center font-medium has-[:checked]:border-transparent has-[:checked]:bg-pri-c has-[:checked]:text-on-pri-c"><input type="radio" name="mode" value={m} defaultChecked={i === 0} className="sr-only" />{m}</label>)}</fieldset>
      {type !== "expense" && <label className="field"><span>Note (optional)</span><input name="narration" className="input" placeholder="UTR / cheque number" /></label>}
      {s.error && <p role="alert" className="text-sm font-medium text-err">{s.error}</p>}
      <button className="btn btn-filled btn-lg" disabled={pending}>{pending ? "Posting…" : "Post voucher"}</button>
      <p className="text-xs text-ink2">This posts a {type === "expense" ? "journal" : type} voucher: {type === "receipt" ? "Bank/Cash Dr, customer Cr" : type === "payment" ? "supplier Dr, Bank/Cash Cr" : "expense Dr, Bank/Cash Cr"}.</p>
    </form>
  );
}
