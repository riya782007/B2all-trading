"use client";
import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { bankMatchesAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";
type Book = { voucher_id: string; date: string; amount: number; dir: "in" | "out"; label: string };
type Row = { date: string; text: string; amount: number; dir: "in" | "out"; ref: string };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function parseDate(s: string) {
  s = s.trim().replace(/\//g, "-").replace(/\./g, "-");
  let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s); return Number.isFinite(+d) ? d.toISOString().slice(0, 10) : "";
}
function splitCsv(line: string) { const out: string[] = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if ((ch === "," || ch === "\t") && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); }
function parse(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const hi = lines.findIndex((l) => /date/i.test(l) && /(debit|withdraw|credit|deposit|amount)/i.test(l)); if (hi < 0) return [];
  const h = splitCsv(lines[hi]).map((x) => x.toLowerCase());
  const col = (re: RegExp) => h.findIndex((x) => re.test(x));
  const di = col(/date/), ti = col(/narration|description|particular|remark|detail/), wi = col(/withdraw|debit|dr\b/), ci = col(/deposit|credit|cr\b/), ri = col(/ref|chq|cheque|utr/);
  const n = (x?: string) => Number((x ?? "").replace(/[^\d.-]/g, "")) || 0;
  return lines.slice(hi + 1).map(splitCsv).map((c) => ({ date: parseDate(c[di] ?? ""), text: c[ti] ?? "", w: n(c[wi]), d: n(c[ci]), ref: ri >= 0 ? c[ri] : "" }))
    .filter((r) => r.date && (r.w || r.d)).map((r) => ({ date: r.date, text: r.text, amount: r.d || r.w, dir: r.d ? "in" : "out", ref: r.ref }));
}
export default function Statement({ ledgerId, book }: { ledgerId: string; book: Book[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [st, act, pending] = useActionState<FormState, FormData>(bankMatchesAction, {});
  // match each statement line with one unreconciled book entry: same direction, same amount, within 10 days
  const used = new Set<string>();
  const matches = (rows ?? []).map((r) => { const b = book.filter((x) => !used.has(x.voucher_id) && x.dir === r.dir && Math.abs(x.amount - r.amount) < 0.01 && Math.abs(+new Date(x.date) - +new Date(r.date)) <= 10 * 864e5).sort((a, c) => Math.abs(+new Date(a.date) - +new Date(r.date)) - Math.abs(+new Date(c.date) - +new Date(r.date)))[0]; if (b) used.add(b.voucher_id); return { r, b }; });
  const found = matches.filter((m) => m.b);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-3"><Upload size={18} className="text-pri" /><div className="mr-auto"><div className="font-medium">Upload bank statement (CSV or Excel saved as CSV)</div><div className="text-xs text-ink2">Works with SBI, HDFC, ICICI, Axis and most banks: needs Date, Narration and Debit/Credit (or Withdrawal/Deposit) columns.</div></div>
        <input type="file" accept=".csv,.txt" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setRows(parse(await f.text())); }} /></div>
      {rows && <div className="mt-4">
        {!rows.length ? <p className="text-sm text-err">Could not find Date and Debit/Credit columns in that file.</p> : <>
          <p className="mb-2 text-sm"><b>{found.length}</b> of {rows.length} statement lines match your books. {rows.length - found.length > 0 && `${rows.length - found.length} are not in the books yet (bank charges, interest, direct credits). Click to enter them.`}</p>
          <div className="max-h-80 overflow-auto rounded-xl border border-line"><table className="tbl min-w-[720px]"><thead className="sticky top-0 bg-s1"><tr><th>Bank date</th><th>Statement</th><th className="num">Amount</th><th>Matched with</th></tr></thead><tbody>
            {matches.map(({ r, b }, i) => <tr key={i} className={b ? "" : "bg-err-c/40"}><td>{r.date}</td><td className="text-xs">{r.text}</td><td className="num">{r.dir === "in" ? "+" : "−"}{inr(r.amount)}</td><td className="text-xs">{b ? b.label : <a className="text-pri underline" href={`/owner/accounts/voucher?type=${r.dir === "in" ? "receipt" : "payment"}&amount=${r.amount}&date=${r.date}&narration=${encodeURIComponent(r.text.slice(0, 120))}`}>Enter as {r.dir === "in" ? "receipt" : "payment"}</a>}</td></tr>)}
          </tbody></table></div>
          <form action={act} className="mt-3 flex items-center gap-3"><input type="hidden" name="ledger_id" value={ledgerId} /><input type="hidden" name="matches" value={JSON.stringify(found.map((m) => ({ voucher_id: m.b!.voucher_id, bank_date: m.r.date, ref: m.r.ref || m.r.text.slice(0, 60) })))} />
            <button className="btn btn-filled" disabled={!found.length || pending}>{pending ? "Saving…" : `Mark ${found.length} as cleared`}</button>{st.ok && <span className="text-sm text-ok">{st.ok}</span>}{st.error && <span className="text-sm text-err">{st.error}</span>}</form></>}
      </div>}
    </div>
  );
}
