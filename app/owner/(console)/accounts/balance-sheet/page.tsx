import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { finalAccounts } from "@/lib/books";
import { fdate, inr, today } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
import { Denied, Page } from "@/components/ui";
type Grp = { group: string; amount: number; ledgers: { id: string; name: string; amount: number }[] };
const Rows = ({ rows }: { rows: Grp[] }) => <>{rows.map((g) => <details key={g.group} className="px-5 py-2.5"><summary className="flex cursor-pointer justify-between font-medium"><span>{g.group}</span><span className="tabular-nums">{inr(g.amount, 2)}</span></summary>{g.ledgers.map((l) => <Link key={l.id} href={`/owner/accounts/ledgers/${l.id}`} className="flex justify-between py-1 pl-4 text-sm text-ink2 hover:text-pri"><span>{l.name}</span><span className="tabular-nums">{inr(l.amount, 2)}</span></Link>)}</details>)}</>;
const Line = ({ l, v, tone = "" }: { l: string; v: number; tone?: string }) => <div className={`flex justify-between px-5 py-2.5 font-medium ${tone}`}><span>{l}</span><span className="tabular-nums">{inr(v, 2)}</span></div>;
export default async function BalanceSheet() {
  if (!(await staff("accounts"))) return <Denied />;
  const f = await finalAccounts(await getStore());
  return (
    <Page title="Balance Sheet" sub={`As on ${fdate(today())}. Liabilities on the left and assets on the right, as in Tally.`} actions={<PrintButton label="Print" />}>
      <div className={`mb-4 flex items-center gap-3 rounded-xl px-5 py-4 ${f.balanced ? "bg-ok-c text-on-ok-c" : "bg-err-c text-on-err-c"}`}>{f.balanced ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}<span className="font-medium">{f.balanced ? "Balance sheet tallies." : "Totals do not match. Check opening balances."}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card divide-y divide-line overflow-hidden"><div className="bg-s2 px-5 py-3 text-sm font-semibold">Liabilities</div><Rows rows={f.liabilities} /><Line l="Profit & Loss A/c" v={f.netProfit} />{f.openingDiff > 0 && <Line l="Difference in opening balances" v={f.openingDiff} tone="text-err" />}<div className="flex justify-between border-t-2 border-ink px-5 py-3 font-semibold"><span>Total</span><span>{inr(f.liabTotal, 2)}</span></div></div>
        <div className="card divide-y divide-line overflow-hidden"><div className="bg-s2 px-5 py-3 text-sm font-semibold">Assets</div><Rows rows={f.assets} /><Line l="Closing stock" v={f.closingStock} />{f.openingDiff < 0 && <Line l="Difference in opening balances" v={-f.openingDiff} tone="text-err" />}<div className="flex justify-between border-t-2 border-ink px-5 py-3 font-semibold"><span>Total</span><span>{inr(f.assetTotal, 2)}</span></div></div>
      </div>
      {f.openingDiff !== 0 && <p className="mt-3 text-sm text-ink2">A difference in opening balances means the opening debit and credit balances you entered do not match, exactly as Tally shows it. Usually the capital account opening needs to include your opening stock and cash. Fix it in the Capital ledger.</p>}
    </Page>
  );
}
