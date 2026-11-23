"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { postVoucherAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";

type L = { id: string; name: string; grp: string; party_id: string | null; cash: boolean };
type Bill = { id: string; number: string; party_id: string; kind: string; balance: number; date: string };
type Line = { key: number; ledger: string; side: "Dr" | "Cr"; amount: string };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Entry({ type, date, amount, narration, ledgers, bills }: { type: "contra" | "payment" | "receipt" | "journal"; date: string; amount?: string; narration?: string; ledgers: L[]; bills: Bill[] }) {
  const router = useRouter();
  const cashFirst = ledgers.find((l) => l.cash)?.name ?? "";
  // Tally's default layout for each type: payment Dr party/expense, Cr bank; receipt Dr bank, Cr party.
  const init: Line[] = type === "receipt" ? [{ key: 1, ledger: cashFirst, side: "Dr", amount: amount ?? "" }, { key: 2, ledger: "", side: "Cr", amount: amount ?? "" }]
    : type === "payment" ? [{ key: 1, ledger: "", side: "Dr", amount: amount ?? "" }, { key: 2, ledger: cashFirst, side: "Cr", amount: amount ?? "" }]
    : [{ key: 1, ledger: "", side: "Dr", amount: amount ?? "" }, { key: 2, ledger: "", side: "Cr", amount: amount ?? "" }];
  const [lines, setLines] = useState<Line[]>(init);
  const [bill, setBill] = useState("");
  const [st, act, pending] = useActionState<FormState, FormData>(postVoucherAction, {});
  const [req] = useState(() => crypto.randomUUID());
  const form = useRef<HTMLFormElement>(null);
  const byName = useMemo(() => new Map(ledgers.map((l) => [l.name.toLowerCase(), l])), [ledgers]);
  const resolved = lines.map((l) => ({ ...l, led: byName.get(l.ledger.trim().toLowerCase()) }));
  const dr = resolved.filter((l) => l.side === "Dr").reduce((t, l) => t + (Number(l.amount) || 0), 0);
  const cr = resolved.filter((l) => l.side === "Cr").reduce((t, l) => t + (Number(l.amount) || 0), 0);
  const diff = Math.round((dr - cr) * 100) / 100;
  const party = resolved.find((l) => l.led?.party_id)?.led;
  const partyBills = party ? bills.filter((b) => b.party_id === party.party_id && (type === "receipt" ? b.kind === "sale" : b.kind === "purchase")) : [];
  const ledgerList = ledgers.filter((l) => type === "contra" ? l.cash : type === "journal" ? !l.cash : true);
  const set = (k: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...p } : l)));
  const add = () => setLines((ls) => [...ls, { key: Math.max(...ls.map((l) => l.key)) + 1, ledger: "", side: diff > 0 ? "Cr" : "Dr", amount: diff ? String(Math.abs(diff)) : "" }]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") { e.preventDefault(); form.current?.requestSubmit(); }
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement && e.target.value)) router.push("/owner/accounts");
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [router]);
  const payload = JSON.stringify(resolved.filter((l) => l.led && Number(l.amount) > 0).map((l) => ({ ledger_id: l.led!.id, side: l.side, amount: Number(l.amount) })));
  const unknown = resolved.filter((l) => l.ledger.trim() && !l.led);
  return (
    <form ref={form} action={act} className="card space-y-5 p-5 sm:p-6">
      <input type="hidden" name="type" value={type} /><input type="hidden" name="lines" value={payload} /><input type="hidden" name="request_id" value={req} />
      <datalist id="ledgers">{ledgerList.map((l) => <option key={l.id} value={l.name}>{l.grp}</option>)}</datalist>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]"><label className="field"><span>Date (F2)</span><input name="date" type="date" defaultValue={date} className="input" required /></label></div>
      <div className="overflow-x-auto"><table className="tbl min-w-[640px]"><thead><tr><th className="w-20">Dr/Cr</th><th>Particulars (type to search ledgers)</th><th className="num w-44">Debit</th><th className="num w-44">Credit</th><th className="w-10"></th></tr></thead><tbody>
        {resolved.map((l, i) => <tr key={l.key}>
          <td><select aria-label="Debit or credit" value={l.side} onChange={(e) => set(l.key, { side: e.target.value as "Dr" | "Cr" })} className="input !w-20 !px-2 !py-1.5"><option>Dr</option><option>Cr</option></select></td>
          <td><input list="ledgers" autoFocus={i === 0 && !l.ledger} value={l.ledger} onChange={(e) => set(l.key, { ledger: e.target.value })} placeholder={l.side === "Dr" ? "By ledger…" : "To ledger…"} className={`input !py-1.5 ${l.ledger && !l.led ? "!border-err" : ""}`} aria-label="Ledger" />{l.led && <div className="mt-1 text-[11px] text-ink2">{l.led.grp}</div>}</td>
          <td><input inputMode="decimal" disabled={l.side !== "Dr"} value={l.side === "Dr" ? l.amount : ""} onChange={(e) => set(l.key, { amount: e.target.value.replace(/[^\d.]/g, "") })} onKeyDown={(e) => { if (e.key === "Enter" && i === resolved.length - 1 && diff) { e.preventDefault(); add(); } }} className="input !py-1.5 text-right tabular-nums" aria-label="Debit amount" /></td>
          <td><input inputMode="decimal" disabled={l.side !== "Cr"} value={l.side === "Cr" ? l.amount : ""} onChange={(e) => set(l.key, { amount: e.target.value.replace(/[^\d.]/g, "") })} onKeyDown={(e) => { if (e.key === "Enter" && i === resolved.length - 1 && diff) { e.preventDefault(); add(); } }} className="input !py-1.5 text-right tabular-nums" aria-label="Credit amount" /></td>
          <td>{resolved.length > 2 && <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="grid size-9 place-items-center rounded-lg hover:bg-s2" aria-label="Remove line"><Trash2 size={15} /></button>}</td>
        </tr>)}
        <tr className="font-semibold"><td colSpan={2}><button type="button" onClick={add} className="btn btn-text btn-sm"><Plus size={15} />Add line</button></td><td className="num">{inr(dr)}</td><td className="num">{inr(cr)}</td><td /></tr>
      </tbody></table></div>
      {diff !== 0 && <p className="text-sm font-medium text-err">Difference of {inr(Math.abs(diff))} on the {diff > 0 ? "credit" : "debit"} side. Press Enter on the last amount to add the balancing line.</p>}
      {unknown.length > 0 && <p className="text-sm text-err">No ledger called “{unknown[0].ledger}”. Press Alt+C to create it, or pick one from the list.</p>}
      {(type === "receipt" || type === "payment") && party && <label className="field"><span>Bill-wise: against which bill? ({party.name})</span>
        <select name="invoice_id" value={bill} onChange={(e) => setBill(e.target.value)} className="input"><option value="">On account / advance</option>{partyBills.map((b) => <option key={b.id} value={b.id}>Agst Ref {b.number} · {b.date} · balance {inr(b.balance)}</option>)}</select></label>}
      <label className="field"><span>Narration</span><textarea name="narration" defaultValue={narration} className="input min-h-20" placeholder="Cheque no., UTR, purpose…" /></label>
      {st.error && <p role="alert" className="text-sm font-medium text-err">{st.error}</p>}
      <div className="flex flex-wrap items-center gap-3"><button className="btn btn-filled btn-lg" disabled={pending || diff !== 0 || dr <= 0 || unknown.length > 0}>{pending ? "Saving…" : "Accept (Ctrl+A)"}</button><span className="text-xs text-ink2">Saved vouchers cannot be edited or deleted, only reversed, so the books always match the edit log.</span></div>
    </form>
  );
}
