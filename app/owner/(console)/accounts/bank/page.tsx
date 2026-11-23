import Link from "next/link";
import { Landmark } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { bankBook } from "@/lib/books";
import { inr, sdate } from "@/lib/money";
import { bankDateAction } from "@/app/books-actions";
import { Denied, Empty, Page, Stat } from "@/components/ui";
import Statement from "./statement";
export default async function Bank({ searchParams }: { searchParams: Promise<{ l?: string; show?: string }> }) {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const sp = await searchParams; const s = await getStore();
  const banks = (await s.all("ledgers")).filter((l) => l.grp === "Bank Accounts" || l.grp === "Bank OD A/c");
  if (!banks.length) return <Page title="Bank reconciliation"><Empty icon={Landmark} title="No bank ledger yet">Create one under Bank Accounts with Alt+C.</Empty></Page>;
  const lid = banks.find((b) => b.id === sp.l)?.id ?? banks[0].id;
  let b; try { b = (await bankBook(s, lid))!; } catch { return <Page title="Bank reconciliation"><Empty icon={Landmark} title="Install the latest database update">Run 006_tally_offers.sql in Supabase to turn on bank reconciliation.</Empty></Page>; }
  const show = sp.show ?? "pending";
  const lines = b.lines.filter((x) => show === "all" || !x.bank_date);
  const can = allowed(me, "accounts", "create");
  return (
    <Page title="Bank reconciliation" sub="Mark when each entry actually cleared in the bank, or upload the bank statement and let the matching happen for you. Same as Tally's BRS.">
      <div className="mb-4 flex flex-wrap gap-2">{banks.map((x) => <Link key={x.id} href={`?l=${x.id}`} className="filter" aria-current={x.id === lid}>{x.name}</Link>)}</div>
      <div className="statrow mb-5"><Stat label="Balance as per books" value={inr(b.books, 2)} /><Stat label="Deposits not yet in bank" value={inr(b.notInBankDeposits, 2)} hint="less" /><Stat label="Payments not yet cleared" value={inr(b.notInBankCheques, 2)} hint="add" /><Stat label="Balance as per bank" value={inr(b.asPerBank, 2)} tone="pri" hint="should match your statement" /></div>
      {can && <Statement ledgerId={lid} book={b.lines.filter((x) => !x.bank_date).map((x) => ({ voucher_id: x.voucher.id, date: x.voucher.date, amount: x.dr || x.cr, dir: x.dr ? "in" : "out", label: `${x.voucher.number} · ${x.party || x.voucher.narration}`.slice(0, 80) }))} />}
      <div className="mb-3 mt-6 flex gap-2"><Link href={`?l=${lid}&show=pending`} className="filter" aria-current={show === "pending"}>Not yet reconciled</Link><Link href={`?l=${lid}&show=all`} className="filter" aria-current={show === "all"}>All entries</Link></div>
      <div className="card overflow-x-auto"><table className="tbl min-w-[760px]"><thead><tr><th>Date</th><th>Particulars</th><th className="num">Deposit</th><th className="num">Withdrawal</th><th>Bank date</th></tr></thead><tbody>
        {lines.map((x) => <tr key={x.voucher.id}><td>{sdate(x.voucher.date)}</td><td><Link href={`/owner/accounts/v/${x.voucher.id}`} className="font-medium text-pri hover:underline">{x.voucher.number}</Link><div className="text-xs text-ink2">{x.party || x.voucher.narration}</div></td><td className="num">{x.dr ? inr(x.dr, 2) : ""}</td><td className="num">{x.cr ? inr(x.cr, 2) : ""}</td>
          <td>{can ? <form action={bankDateAction} className="flex gap-1"><input type="hidden" name="voucher_id" value={x.voucher.id} /><input type="hidden" name="ledger_id" value={lid} /><input type="date" name="bank_date" defaultValue={x.bank_date ?? ""} className="input !py-1" aria-label="Bank date" /><button className="btn btn-text btn-sm">Save</button></form> : x.bank_date ? sdate(x.bank_date) : "-"}</td></tr>)}
        {!lines.length && <tr><td colSpan={5} className="text-ink2">Everything is reconciled.</td></tr>}
      </tbody></table></div>
    </Page>
  );
}
