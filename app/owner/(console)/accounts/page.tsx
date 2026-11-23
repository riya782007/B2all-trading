import Link from "next/link";
import { BookOpen, Keyboard } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { balances } from "@/lib/domain";
import { dayBook, VKEY, VLABEL } from "@/lib/books";
import { fy, inr, sdate, today } from "@/lib/money";
import type { VType } from "@/lib/types";
import { Chip, Denied, Empty, Notice, Page, Stat } from "@/components/ui";
const TONE: Record<VType, "green" | "blue" | "amber" | "grey" | "red"> = { sales: "green", purchase: "blue", receipt: "green", payment: "amber", journal: "grey", contra: "grey", credit_note: "red", debit_note: "red" };
export default async function DayBook({ searchParams }: { searchParams: Promise<{ type?: string; saved?: string; from?: string; to?: string }> }) {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const sp = await searchParams; const s = await getStore();
  const fyStart = `${fy().slice(0, 4)}-04-01`;
  const from = sp.from ?? fyStart, to = sp.to ?? today(), type = sp.type ?? "all";
  const [rows, parties, bal, allV] = await Promise.all([dayBook(s, { from, to, type }), s.all("parties"), balances(s), s.all("vouchers")]);
  const cash = bal.filter((b) => b.grp === "Cash-in-Hand").reduce((t, b) => t + b.closing, 0), bank = bal.filter((b) => b.grp === "Bank Accounts").reduce((t, b) => t + b.closing, 0);
  const q = (p: Record<string, string>) => `/owner/accounts?${new URLSearchParams({ from, to, type, ...p })}`;
  const types: VType[] = ["sales", "purchase", "receipt", "payment", "contra", "journal", "credit_note", "debit_note"];
  return (
    <Page title="Day book" sub="Every voucher in date order, exactly like Tally's Day Book. Click a voucher to see its entries and edit log."
      actions={allowed(me, "accounts", "create") && <><Link href="/owner/accounts/voucher?type=receipt" className="btn btn-filled">Receipt <kbd className="text-[10px] opacity-70">F6</kbd></Link><Link href="/owner/accounts/voucher?type=payment" className="btn btn-tonal">Payment <kbd className="text-[10px] opacity-70">F5</kbd></Link><Link href="/owner/accounts/voucher?type=journal" className="btn btn-outline">Journal <kbd className="text-[10px] opacity-70">F7</kbd></Link></>}>
      {sp.saved && <Notice>Voucher posted.</Notice>}
      <div className="mb-6 statrow"><Stat label="Bank balance" value={inr(bank)} tone="pri" href="/owner/accounts/bank" /><Stat label="Cash in hand" value={inr(cash)} /><Stat label={`Vouchers ${sdate(from)} – ${sdate(to)}`} value={rows.length} /><Stat label="Not yet in Tally" value={allV.filter((v) => !v.tally_exported).length} href="/owner/accounts/tally" tone="ter" /></div>
      <form className="mb-3 flex flex-wrap items-end gap-2" action="/owner/accounts"><input type="hidden" name="type" value={type} /><label className="field"><span>From</span><input type="date" name="from" defaultValue={from} className="input" /></label><label className="field"><span>To</span><input type="date" name="to" defaultValue={to} className="input" /></label><button className="btn btn-outline">Show</button><Link className="btn btn-text" href={q({ from: today(), to: today() })}>Today</Link></form>
      <div className="mb-4 flex flex-wrap gap-2"><Link href={q({ type: "all" })} className="filter" aria-current={type === "all"}>All</Link>{types.map((t) => <Link key={t} href={q({ type: t })} className="filter" aria-current={type === t}>{VLABEL[t]}</Link>)}</div>
      {!rows.length ? <Empty icon={BookOpen} title="No vouchers in this period" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[760px]"><thead><tr><th>Date</th><th>Particulars</th><th>Type</th><th>Voucher no.</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead><tbody>
          {rows.map((v) => <tr key={v.id}><td>{sdate(v.date)}</td><td><Link href={`/owner/accounts/v/${v.id}`} className="font-medium text-pri hover:underline">{parties.find((p) => p.id === v.party_id)?.name ?? v.narration.slice(0, 60)}</Link><div className="text-xs text-ink2">{v.narration}</div></td><td><Chip tone={TONE[v.type]}>{VLABEL[v.type]}</Chip></td><td className="text-sm">{v.number}</td><td className="num">{inr(v.amount, 2)}</td><td className="num">{inr(v.amount, 2)}</td></tr>)}
          <tr className="font-semibold"><td colSpan={4}>Total</td><td className="num">{inr(rows.reduce((t, v) => t + Number(v.amount), 0), 2)}</td><td className="num">{inr(rows.reduce((t, v) => t + Number(v.amount), 0), 2)}</td></tr>
        </tbody></table></div>)}
      <p className="mt-4 flex items-center gap-2 text-xs text-ink2"><Keyboard size={14} />Tally keys work everywhere in the console: {Object.entries(VKEY).map(([t, k]) => `${k} ${VLABEL[t as VType]}`).join(" · ")} · Alt+C new ledger · Alt+G go to · Ctrl+/ all keys.</p>
    </Page>
  );
}
