import { CheckCircle2, AlertTriangle } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { trialBalance } from "@/lib/domain";
import { primaryOf } from "@/lib/books";
import Link from "next/link";
import { inr } from "@/lib/money";
import { Denied, Page } from "@/components/ui";
export default async function Reports() {
  if (!(await staff("accounts"))) return <Denied />;
  const s = await getStore(); const tb = await trialBalance(s);
  const prim = [...new Set(tb.rows.map((r) => primaryOf(r.grp)?.name ?? r.grp))];
  return (
    <Page title="Trial balance" sub="Group-wise closing balances, from the start of the books to today. Debit total must equal credit total.">
      <div className={`mb-4 flex items-center gap-3 rounded-xl px-5 py-4 ${tb.ok ? "bg-ok-c text-on-ok-c" : "bg-err-c text-on-err-c"}`}>{tb.ok ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}<span className="font-medium">{tb.ok ? "Books balance. Total debit equals total credit." : "Debit and credit do not match. Check opening balances."}</span></div>
      <div className="card overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead><tbody>
        {prim.map((p) => { const rs = tb.rows.filter((r) => (primaryOf(r.grp)?.name ?? r.grp) === p); const t = rs.reduce((n, r) => n + r.closing, 0); return [<tr key={p} className="bg-s2 font-semibold"><td>{p}</td><td className="num">{t > 0 ? inr(t, 2) : ""}</td><td className="num">{t < 0 ? inr(-t, 2) : ""}</td></tr>, ...rs.map((r) => <tr key={r.id}><td className="pl-8"><Link href={`/owner/accounts/ledgers/${r.id}`} className="hover:text-pri">{r.name}</Link> <span className="text-xs text-ink2">{r.grp !== p ? r.grp : ""}</span></td><td className="num">{r.closing > 0 ? inr(r.closing, 2) : ""}</td><td className="num">{r.closing < 0 ? inr(-r.closing, 2) : ""}</td></tr>)]; })}
        <tr className="font-semibold"><td>Grand total</td><td className="num">{inr(tb.dr, 2)}</td><td className="num">{inr(tb.cr, 2)}</td></tr>
      </tbody></table></div>
      <p className="mt-3 text-sm text-ink2">See also <Link className="text-pri underline" href="/owner/accounts/pnl">Profit &amp; Loss</Link>, <Link className="text-pri underline" href="/owner/accounts/balance-sheet">Balance Sheet</Link> and <Link className="text-pri underline" href="/owner/accounts/gst">GST returns</Link>.</p>
    </Page>
  );
}
