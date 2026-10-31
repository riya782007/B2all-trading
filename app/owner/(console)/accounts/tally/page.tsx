import { Download } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { inr, sdate } from "@/lib/money";
import { Chip, Denied, Page } from "@/components/ui";
export default async function Tally() {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const vs = (await (await getStore()).all("vouchers")).sort((a, b) => b.date.localeCompare(a.date));
  const pending = vs.filter((v) => !v.tally_exported);
  return (
    <Page title="Tally" sub="Your accountant keeps using Tally. Everything entered here goes across in one file: ledgers first, then vouchers.">
      <div className="card mb-5 p-6">
        <ol className="list-decimal space-y-1 pl-5 text-ink2"><li>Download the two files below.</li><li>In TallyPrime: Import → Masters, choose the ledgers file.</li><li>Then Import → Transactions, choose the vouchers file.</li></ol>
        {allowed(me, "accounts", "export") && <div className="mt-5 flex flex-wrap gap-2"><a href="/owner/export/tally?part=masters" className="btn btn-outline"><Download size={18} />Ledgers file</a><a href={`/owner/export/tally?part=vouchers`} className="btn btn-filled"><Download size={18} />Vouchers file · {pending.length} new</a><a href={`/owner/export/tally?part=vouchers&all=1`} className="btn btn-text">All vouchers again</a></div>}
        <p className="mt-4 text-sm text-ink2">Try it once in a test company first. Party and tax ledger names are created for you; GST rates on stock items are not sent, only the amounts.</p>
      </div>
      <div className="card overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th className="num">Amount</th><th>In Tally</th></tr></thead><tbody>
        {vs.slice(0, 60).map((v) => <tr key={v.id}><td>{sdate(v.date)}</td><td className="font-medium">{v.number}</td><td>{v.type}</td><td className="num">{inr(v.amount)}</td><td>{v.tally_exported ? <Chip tone="green">Sent</Chip> : <Chip tone="amber">New</Chip>}</td></tr>)}
      </tbody></table></div>
    </Page>
  );
}
