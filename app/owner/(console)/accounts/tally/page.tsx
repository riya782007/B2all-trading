import { confirmTallyImport } from "@/app/actions";
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
    <Page title="Tally" sub="Keep Tally alongside B2All. Export a reviewed batch, check the import result, then confirm it here.">
      <div className="card mb-5 p-6">
        <ol className="list-decimal space-y-1 pl-5 text-ink2"><li>Download the two files below.</li><li>In TallyPrime: Import → Masters, choose the ledgers file.</li><li>Then Import → Transactions, choose the vouchers file.</li></ol>
        {allowed(me, "accounts", "export") && <div className="mt-5 flex flex-wrap gap-2"><a href="/owner/export/tally?part=masters" className="btn btn-outline"><Download size={18} />Ledgers file</a><a href={`/owner/export/tally?part=vouchers`} className="btn btn-filled"><Download size={18} />Vouchers file · {pending.length} new</a><a href={`/owner/export/tally?part=vouchers&all=1`} className="btn btn-text">All vouchers again</a></div>}
        <p className="mt-4 text-sm text-ink2">Try it once in a test company first. Party and tax ledger names are created for you; GST rates on stock items are not sent, only the amounts.</p>
      </div>
      {allowed(me,"accounts","export") && pending.length > 0 && <form action={confirmTallyImport} className="card mb-5 space-y-4 p-6"><h2 className="text-lg">After importing into Tally</h2><p className="text-sm text-ink2">Confirm only after checking that every voucher in this batch imported successfully. Downloading a file does not change its status.</p>{pending.map(v=><input key={v.id} type="hidden" name="voucher_id" value={v.id}/>)}<label className="flex items-start gap-3 text-sm"><input type="checkbox" required name="confirmed" className="mt-1 size-5"/>I checked Tally’s import results and reconciled these {pending.length} vouchers.</label><button className="btn btn-outline">Confirm this batch imported</button></form>}
      <div className="card overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th className="num">Amount</th><th>Import confirmation</th></tr></thead><tbody>
        {vs.slice(0, 60).map((v) => <tr key={v.id}><td>{sdate(v.date)}</td><td className="font-medium">{v.number}</td><td>{v.type}</td><td className="num">{inr(v.amount)}</td><td>{v.tally_exported ? <Chip tone="green">Confirmed</Chip> : <Chip tone="amber">New</Chip>}</td></tr>)}
      </tbody></table></div>
    </Page>
  );
}
