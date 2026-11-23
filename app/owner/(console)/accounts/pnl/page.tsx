import Link from "next/link";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { finalAccounts } from "@/lib/books";
import { fdate, inr, today } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
import { Denied, Page } from "@/components/ui";
type Grp = { group: string; amount: number; ledgers: { id: string; name: string; amount: number }[] };
function Side({ rows, extra }: { rows: Grp[]; extra: [string, number][] }) {
  return <div className="divide-y divide-line">{extra.filter(([, v]) => v).map(([l, v]) => <div key={l} className="flex justify-between px-5 py-2.5 font-medium"><span>{l}</span><span className="tabular-nums">{inr(v, 2)}</span></div>)}
    {rows.map((g) => <details key={g.group} className="px-5 py-2.5"><summary className="flex cursor-pointer justify-between font-medium"><span>{g.group}</span><span className="tabular-nums">{inr(g.amount, 2)}</span></summary>{g.ledgers.map((l) => <Link key={l.id} href={`/owner/accounts/ledgers/${l.id}`} className="flex justify-between py-1 pl-4 text-sm text-ink2 hover:text-pri"><span>{l.name}</span><span className="tabular-nums">{inr(l.amount, 2)}</span></Link>)}</details>)}</div>;
}
export default async function PnL() {
  if (!(await staff("accounts"))) return <Denied />;
  const f = await finalAccounts(await getStore());
  const sum = (a: Grp[]) => a.reduce((t, g) => t + g.amount, 0);
  const tradeL = f.openingStock + sum(f.dExp) + (f.grossProfit > 0 ? f.grossProfit : 0), tradeR = f.closingStock + sum(f.dInc) + (f.grossProfit < 0 ? -f.grossProfit : 0);
  return (
    <Page title="Profit & Loss A/c" sub={`From the start of the books to ${fdate(today())}. Trading account on top (gross profit), then indirect items (net profit). Same layout as Tally.`} actions={<PrintButton label="Print" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden"><div className="bg-s2 px-5 py-3 text-sm font-semibold">Particulars (expenses)</div><Side rows={f.dExp} extra={[["Opening stock", f.openingStock]]} />{f.grossProfit > 0 && <div className="flex justify-between border-t border-line px-5 py-2.5 font-semibold text-ok"><span>Gross profit c/o</span><span>{inr(f.grossProfit, 2)}</span></div>}<div className="flex justify-between border-t-2 border-ink px-5 py-2.5 font-semibold"><span>Total</span><span>{inr(tradeL, 2)}</span></div>
          {f.grossProfit < 0 && <div className="flex justify-between px-5 py-2.5 font-semibold text-err"><span>Gross loss b/f</span><span>{inr(-f.grossProfit, 2)}</span></div>}<Side rows={f.iExp} extra={[]} />{f.netProfit > 0 && <div className="flex justify-between border-t border-line px-5 py-2.5 font-semibold text-ok"><span>Net profit</span><span>{inr(f.netProfit, 2)}</span></div>}</div>
        <div className="card overflow-hidden"><div className="bg-s2 px-5 py-3 text-sm font-semibold">Particulars (income)</div><Side rows={f.dInc} extra={[]} /><div className="flex justify-between px-5 py-2.5 font-medium"><span>Closing stock (from stock summary)</span><span>{inr(f.closingStock, 2)}</span></div>{f.grossProfit < 0 && <div className="flex justify-between border-t border-line px-5 py-2.5 font-semibold text-err"><span>Gross loss c/o</span><span>{inr(-f.grossProfit, 2)}</span></div>}<div className="flex justify-between border-t-2 border-ink px-5 py-2.5 font-semibold"><span>Total</span><span>{inr(tradeR, 2)}</span></div>
          {f.grossProfit > 0 && <div className="flex justify-between px-5 py-2.5 font-semibold text-ok"><span>Gross profit b/f</span><span>{inr(f.grossProfit, 2)}</span></div>}<Side rows={f.iInc} extra={[]} />{f.netProfit < 0 && <div className="flex justify-between border-t border-line px-5 py-2.5 font-semibold text-err"><span>Net loss</span><span>{inr(-f.netProfit, 2)}</span></div>}</div>
      </div>
      <div className={`mt-5 rounded-xl px-5 py-4 text-lg font-semibold ${f.netProfit >= 0 ? "bg-ok-c text-on-ok-c" : "bg-err-c text-on-err-c"}`}>{f.netProfit >= 0 ? "Net profit" : "Net loss"}: {inr(Math.abs(f.netProfit), 2)} · Gross profit {inr(f.grossProfit, 2)}</div>
      <p className="mt-3 text-xs text-ink2">Closing stock is valued at average purchase cost from the stock summary. Click any group to see its ledgers.</p>
    </Page>
  );
}
