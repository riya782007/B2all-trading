import Link from "next/link";
import { notFound } from "next/navigation";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { statement } from "@/lib/domain";
import { GROUPS, VLABEL } from "@/lib/books";
import { inr, sdate } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
import { Denied, Notice, Page } from "@/components/ui";
import EditLedger from "./edit";
export default async function Ledger({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string; saved?: string }> }) {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const st = await statement(await getStore(), id); if (!st) notFound();
  const dc = (n: number) => `${inr(Math.abs(n), 2)} ${n >= 0 ? "Dr" : "Cr"}`;
  const before = st.lines.filter((l) => sp.from && l.v.date < sp.from);
  const open = before.length ? before.at(-1)!.run : Number(st.ledger.opening) || 0;
  const lines = st.lines.filter((l) => (!sp.from || l.v.date >= sp.from) && (!sp.to || l.v.date <= sp.to));
  const dr = lines.reduce((t, l) => t + l.dr, 0), cr = lines.reduce((t, l) => t + l.cr, 0);
  return (
    <Page title={st.ledger.name} sub={`Under ${st.ledger.grp} · closing ${dc(st.closing)}`} back={{ href: "/owner/accounts/ledgers", label: "Chart of accounts" }} actions={<PrintButton label="Print" />}>
      {sp.saved && <Notice>Ledger created.</Notice>}
      <form className="noprint mb-3 flex flex-wrap items-end gap-2"><label className="field"><span>From</span><input type="date" name="from" defaultValue={sp.from} className="input" /></label><label className="field"><span>To</span><input type="date" name="to" defaultValue={sp.to} className="input" /></label><button className="btn btn-outline">Show</button></form>
      <div className="card overflow-x-auto"><table className="tbl min-w-[760px]"><thead><tr><th>Date</th><th>Voucher</th><th>Narration</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead><tbody>
        <tr><td colSpan={5} className="text-ink2">Opening balance</td><td className="num">{dc(open)}</td></tr>
        {lines.map((l, i) => <tr key={i}><td>{sdate(l.v.date)}</td><td><Link href={`/owner/accounts/v/${l.v.id}`} className="font-medium text-pri hover:underline">{l.v.number}</Link><div className="text-xs text-ink2">{VLABEL[l.v.type]}</div></td><td className="text-sm text-ink2">{l.v.narration}</td><td className="num">{l.dr ? inr(l.dr, 2) : ""}</td><td className="num">{l.cr ? inr(l.cr, 2) : ""}</td><td className="num">{dc(l.run)}</td></tr>)}
        <tr className="font-semibold"><td colSpan={3}>Totals for the period</td><td className="num">{inr(dr, 2)}</td><td className="num">{inr(cr, 2)}</td><td className="num">{dc(lines.at(-1)?.run ?? open)}</td></tr>
      </tbody></table></div>
      {allowed(me, "accounts", "edit") && <EditLedger id={st.ledger.id} grp={st.ledger.grp} opening={Number(st.ledger.opening) || 0} party={!!st.ledger.party_id} groups={GROUPS.map((g) => g.name)} />}
    </Page>
  );
}
