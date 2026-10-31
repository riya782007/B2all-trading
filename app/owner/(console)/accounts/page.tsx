import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Wallet, BookOpen } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { balances } from "@/lib/domain";
import { inr, sdate } from "@/lib/money";
import { Chip, Denied, Empty, Filters, Notice, Page, Stat } from "@/components/ui";
const TONE = { sales: "green", purchase: "blue", receipt: "green", payment: "amber", journal: "grey", contra: "grey" } as const;
export default async function DayBook({ searchParams }: { searchParams: Promise<{ type?: string; saved?: string }> }) {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const { type = "all", saved } = await searchParams; const s = await getStore();
  const [vs, parties, bal] = await Promise.all([s.all("vouchers"), s.all("parties"), balances(s)]);
  const rows = vs.filter((v) => type === "all" || v.type === type).sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  const cash = bal.find((b) => b.name === "Cash")?.closing ?? 0, bank = bal.find((b) => b.name === "Bank")?.closing ?? 0;
  return (
    <Page title="Day book" sub="Every voucher, posted automatically from invoices and bills, or entered here. Same double entry as Tally."
      actions={allowed(me, "accounts", "create") && <><Link href="/owner/accounts/new?type=receipt" className="btn btn-filled"><ArrowDownLeft size={18} />Received</Link><Link href="/owner/accounts/new?type=payment" className="btn btn-tonal"><ArrowUpRight size={18} />Paid</Link><Link href="/owner/accounts/new?type=expense" className="btn btn-outline"><Wallet size={18} />Expense</Link></>}>
      {saved && <Notice>Voucher posted.</Notice>}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Bank" value={inr(bank)} tone="pri" href={`/owner/accounts/ledgers/${bal.find((b) => b.name === "Bank")?.id}`} /><Stat label="Cash" value={inr(cash)} href={`/owner/accounts/ledgers/${bal.find((b) => b.name === "Cash")?.id}`} /><Stat label="Vouchers" value={vs.length} /><Stat label="Not yet in Tally" value={vs.filter((v) => !v.tally_exported).length} href="/owner/accounts/tally" tone="ter" /></div>
      <Filters current={type} items={[["all", "All"], ["sales", "Sales"], ["purchase", "Purchase"], ["receipt", "Receipts"], ["payment", "Payments"], ["journal", "Journal"]].map(([k, l]) => ({ key: k, label: l, href: `/owner/accounts?type=${k}` }))} />
      {!rows.length ? <Empty icon={BookOpen} title="No vouchers yet" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Party / narration</th><th className="num">Amount</th></tr></thead><tbody>
          {rows.map((v) => <tr key={v.id}><td>{sdate(v.date)}</td><td className="font-medium">{v.invoice_id ? <Link href={`/owner/invoices/${v.invoice_id}`} className="text-pri hover:underline">{v.number}</Link> : v.number}</td><td><Chip tone={TONE[v.type]}>{v.type}</Chip></td><td><div>{parties.find((p) => p.id === v.party_id)?.name ?? ""}</div><div className="text-xs text-ink2">{v.narration}</div></td><td className="num font-medium">{inr(v.amount)}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
