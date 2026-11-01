import { CheckCircle2, AlertTriangle } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { gstSummary, trialBalance } from "@/lib/domain";
import { inr } from "@/lib/money";
import { Denied, Page, Section } from "@/components/ui";
export default async function Reports() {
  if (!(await staff("accounts"))) return <Denied />;
  const s = await getStore(); const [tb, gst] = await Promise.all([trialBalance(s), gstSummary(s)]);
  return (
    <Page title="Trial balance and GST" sub="Checks that the books balance, and an estimate of GST for each month.">
      <div className={`mb-4 flex items-center gap-3 rounded-xl px-5 py-4 ${tb.ok ? "bg-ok-c text-on-ok-c" : "bg-err-c text-on-err-c"}`}>{tb.ok ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}<span className="font-medium">{tb.ok ? "Books balance. Total debit equals total credit." : "Debit and credit do not match. Check recent vouchers."}</span></div>
      <div className="card overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Ledger</th><th>Group</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead><tbody>
        {tb.rows.map((r) => <tr key={r.id}><td>{r.name}</td><td className="text-ink2">{r.grp}</td><td className="num">{r.closing > 0 ? inr(r.closing, 2) : ""}</td><td className="num">{r.closing < 0 ? inr(-r.closing, 2) : ""}</td></tr>)}
        <tr className="font-semibold"><td colSpan={2}>Total</td><td className="num">{inr(tb.dr, 2)}</td><td className="num">{inr(tb.cr, 2)}</td></tr>
      </tbody></table></div>
      <Section title="GST by month (estimate for GSTR-3B)">
        <div className="card overflow-x-auto"><table className="tbl min-w-[640px]"><thead><tr><th>Month</th><th className="num">Taxable sales</th><th className="num">Output GST</th><th className="num">Taxable purchases</th><th className="num">Input credit</th><th className="num">Net payable</th></tr></thead><tbody>
          {gst.map((g) => <tr key={g.month}><td>{new Date(g.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</td><td className="num">{inr(g.sales)}</td><td className="num">{inr(g.output)}</td><td className="num">{inr(g.purchases)}</td><td className="num">{inr(g.input)}</td><td className={`num font-semibold ${g.net < 0 ? "text-pri" : ""}`}>{g.net < 0 ? `${inr(-g.net)} credit` : inr(g.net)}</td></tr>)}
        </tbody></table></div>
        <p className="mt-2 text-sm text-ink2">An estimate from invoices recorded here. File returns from Tally or the GST portal after your accountant checks them.</p>
      </Section>
    </Page>
  );
}
