import Link from "next/link";
import { Plus, ReceiptIndianRupee } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews } from "@/lib/domain";
import { inr, num, sdate } from "@/lib/money";
import { Chip, Denied, Empty, Filters, Page, Stat } from "@/components/ui";

export default async function Invoices({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string }> }) {
  const sp = await searchParams; const kind = sp.kind === "purchase" ? "purchase" : "sale"; const status = sp.status ?? "all";
  const me = await staff(kind === "sale" ? "sales" : "purchase"); if (!me) return <Denied />;
  const all = await invoiceViews(await getStore(), kind);
  const rows = all.filter((i) => status === "all" || (status === "due" ? i.balance > 0 : i.status === "paid"));
  const due = all.filter((i) => i.balance > 0);
  return (
    <Page title={kind === "sale" ? "Invoices" : "Supplier bills"} sub={kind === "sale" ? "GST invoices raised from dispatches. Each one posts to accounts automatically." : "Supplier bills matched against what you actually received."}
      actions={allowed(me, kind === "sale" ? "sales" : "purchase", "create") && <Link href={`/owner/invoices/new?kind=${kind}`} className="btn btn-filled"><Plus size={18} />{kind === "sale" ? "New invoice" : "Enter bill"}</Link>}>
      <div className="mb-6 statrow"><Stat label="Total billed" value={inr(all.reduce((t, i) => t + Number(i.total), 0))} hint={`${all.length} ${kind === "sale" ? "invoices" : "bills"}`} /><Stat label={kind === "sale" ? "Still to receive" : "Still to pay"} value={inr(due.reduce((t, i) => t + i.balance, 0))} tone="ter" hint={`${due.length} open`} /><Stat label="Late" value={inr(due.filter((i) => i.overdue).reduce((t, i) => t + i.balance, 0))} tone="err" hint={`${due.filter((i) => i.overdue).length} past due date`} /></div>
      <Filters current={status} items={[["all", "All"], ["due", "Unpaid"], ["paid", "Paid"]].map(([k, l]) => ({ key: k, label: l, href: `/owner/invoices?kind=${kind}&status=${k}` }))} />
      {!rows.length ? <Empty icon={ReceiptIndianRupee} title="Nothing here yet" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[760px]"><thead><tr><th>Number</th><th>Date</th><th>Party</th><th>Material</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th></tr></thead><tbody>
          {rows.map((i) => <tr key={i.id}><td><Link href={`/owner/invoices/${i.id}`} className="font-medium text-pri hover:underline">{i.number}</Link></td><td>{sdate(i.date)}</td><td>{i.party.name}</td><td>{num(i.qty)} {i.material.unit} {i.material.name}</td><td className="num">{inr(i.total)}</td><td className="num">{inr(i.balance)}</td><td><Chip tone={i.status === "paid" ? "green" : i.overdue ? "red" : i.status === "part" ? "blue" : "amber"}>{i.status === "paid" ? "Paid" : i.overdue ? `${i.overdue}d late` : i.status === "part" ? "Part paid" : `Due ${sdate(i.due_date)}`}</Chip></td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
