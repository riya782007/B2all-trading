import Link from "next/link";
import { Download } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { gstReturns } from "@/lib/books";
import { inr, sdate, STATES, today } from "@/lib/money";
import { Denied, Page, Section } from "@/components/ui";
const M = (m: string) => new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
function T({ head, rows }: { head: string[]; rows: (string | number)[][] }) { return <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr>{head.map((h, i) => <th key={h} className={i > 2 ? "num" : ""}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j > 2 ? "num" : ""}>{typeof c === "number" ? inr(c, 2) : c}</td>)}</tr>) : <tr><td colSpan={head.length} className="text-ink2">Nothing this month.</td></tr>}</tbody></table></div>; }
export default async function Gst({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  if (!(await staff("accounts"))) return <Denied />;
  const { m = today().slice(0, 7) } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m) ? m : today().slice(0, 7);
  const g = await gstReturns(await getStore(), month);
  const prev = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5) - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 1)).toISOString().slice(0, 7);
  const dl = (sec: string) => <a href={`/owner/accounts/gst/export?m=${month}&sec=${sec}`} className="btn btn-text btn-sm"><Download size={14} />Excel / CSV</a>;
  return (
    <Page title={`GST returns · ${M(month)}`} sub="GSTR-1 and GSTR-3B worked out from your invoices, bills, credit notes and debit notes. Download each table for your CA or the GST offline tool."
      actions={<div className="flex gap-2"><Link className="btn btn-outline" href={`?m=${prev}`}>← {M(prev)}</Link><Link className="btn btn-outline" href={`?m=${next}`}>{M(next)} →</Link></div>}>
      <div className="statrow mb-6">
        <div className="card p-5"><div className="text-xs text-ink2">Outward taxable value</div><div className="text-2xl font-semibold">{inr(g.out.taxable)}</div></div>
        <div className="card p-5"><div className="text-xs text-ink2">Output GST</div><div className="text-2xl font-semibold">{inr(g.out.igst + g.out.cgst + g.out.sgst)}</div></div>
        <div className="card p-5"><div className="text-xs text-ink2">Input tax credit in books</div><div className="text-2xl font-semibold">{inr(g.itc.igst + g.itc.cgst + g.itc.sgst)}</div></div>
        <div className="card p-5"><div className="text-xs text-ink2">GST to pay in cash</div><div className="text-2xl font-semibold text-pri">{inr(g.payable.total)}</div>{g.carry.total > 0 && <div className="text-xs text-ink2">{inr(g.carry.total)} credit carried forward</div>}</div>
      </div>
      <Section title="GSTR-3B summary" action={dl("3b")}>
        <T head={["Table", "Nature", "", "Taxable value", "IGST", "CGST", "SGST"]} rows={[
          ["3.1(a)", "Outward taxable supplies (net of credit notes)", "", g.out.taxable, g.out.igst, g.out.cgst, g.out.sgst],
          ["4(A)(5)", "All other ITC (net of debit notes)", "", g.itc.taxable, g.itc.igst, g.itc.cgst, g.itc.sgst],
          ["6.1", "Tax payable in cash after set-off", "", "", g.payable.igst, g.payable.cgst, g.payable.sgst],
          ["", "Credit carried forward", "", "", g.carry.igst, g.carry.cgst, g.carry.sgst]]} />
        <p className="mt-2 text-xs text-ink2">Credit is set off in the legal order (IGST first, CGST and SGST never against each other). Before filing, match input credit with GSTR-2B on the portal: only invoices your suppliers have filed can be claimed.</p>
      </Section>
      <Section title={`GSTR-1 · B2B invoices (${g.b2b.length})`} action={dl("b2b")}><T head={["GSTIN of buyer", "Buyer", "Invoice · date · place · rate", "Invoice value", "Taxable", "IGST", "CGST", "SGST"]} rows={g.b2b.map((i) => [i.party_snapshot?.gstin || i.party.gstin || "", i.party.name, `${i.number} · ${sdate(i.date)} · ${STATES[i.place_of_supply] ?? i.place_of_supply} · ${i.gst_rate}%`, Number(i.total), Number(i.taxable), Number(i.igst), Number(i.cgst), Number(i.sgst)])} /></Section>
      <Section title={`GSTR-1 · B2C large (${g.b2cl.length}) and B2C others (${g.b2cs.length})`} action={dl("b2c")}><T head={["Type", "Place of supply", "Rate", "Taxable", "IGST", "CGST", "SGST"]} rows={[...g.b2cl.map((i) => ["B2CL " + i.number, STATES[i.place_of_supply] ?? i.place_of_supply, `${i.gst_rate}%`, Number(i.taxable), Number(i.igst), Number(i.cgst), Number(i.sgst)]), ...g.b2cs.map((x) => ["B2CS", STATES[x.pos] ?? x.pos, `${x.rate}%`, x.taxable, x.igst, x.cgst, x.sgst])]} /></Section>
      <Section title={`GSTR-1 · Credit notes to registered buyers (${g.cdnr.length})`} action={dl("cdnr")}><T head={["GSTIN", "Party", "Note", "Taxable", "IGST", "CGST", "SGST"]} rows={g.cdnr.map((n) => [n.gstin, n.party, `${n.number} · ${sdate(n.date)}${n.against ? ` · agst ${n.against}` : ""}`, n.taxable, n.igst, n.cgst, n.sgst])} /></Section>
      <Section title="GSTR-1 · HSN summary" action={dl("hsn")}><T head={["HSN", "Description", "Quantity", "Taxable", "IGST", "CGST", "SGST"]} rows={g.hsn.map((h) => [h.hsn, h.name, `${h.qty} ${h.unit}`, h.taxable, h.igst, h.cgst, h.sgst])} /></Section>
    </Page>
  );
}
