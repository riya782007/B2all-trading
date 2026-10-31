import { notFound } from "next/navigation";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { statement } from "@/lib/domain";
import { inr, sdate } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
import { Denied, Page } from "@/components/ui";
export default async function Ledger({ params }: { params: Promise<{ id: string }> }) {
  if (!(await staff("accounts"))) return <Denied />;
  const st = await statement(await getStore(), (await params).id); if (!st) notFound();
  const dc = (n: number) => `${inr(Math.abs(n), 2)} ${n >= 0 ? "Dr" : "Cr"}`;
  return (
    <Page title={st.ledger.name} sub={`${st.ledger.grp} · closing ${dc(st.closing)}`} back={{ href: "/owner/accounts/ledgers", label: "Ledgers" }} actions={<PrintButton label="Print" />}>
      <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr><th>Date</th><th>Voucher</th><th>Narration</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead><tbody>
        <tr><td colSpan={5} className="text-ink2">Opening balance</td><td className="num">{dc(Number(st.ledger.opening) || 0)}</td></tr>
        {st.lines.map((l, i) => <tr key={i}><td>{sdate(l.v.date)}</td><td className="font-medium">{l.v.number}</td><td className="text-sm text-ink2">{l.v.narration}</td><td className="num">{l.dr ? inr(l.dr, 2) : ""}</td><td className="num">{l.cr ? inr(l.cr, 2) : ""}</td><td className="num">{dc(l.run)}</td></tr>)}
      </tbody></table></div>
    </Page>
  );
}
