import { STATES, fdate, inr, num, words } from "@/lib/money";
import type { Company } from "@/lib/types";
import type { InvoiceView } from "@/lib/domain";

/** Printable GST tax invoice. Same layout for the console and the customer page. */
export default function InvoiceDoc({ inv, co, vehicles }: { inv: InvoiceView; co: Company; vehicles: string[] }) {
  const sale = inv.kind === "sale";
  const seller = sale ? { name: co.name, gstin: co.gstin, addr: co.address } : { name: inv.party.name, gstin: inv.party.gstin, addr: inv.party.address || inv.party.city };
  const buyer = sale ? { name: inv.party.name, gstin: inv.party.gstin, addr: inv.party.address || inv.party.city } : { name: co.name, gstin: co.gstin, addr: co.address };
  const rows: [string, number][] = [["Taxable value", inv.taxable], ...(inv.igst ? [[`IGST @ ${inv.gst_rate}%`, inv.igst] as [string, number]] : [[`CGST @ ${inv.gst_rate / 2}%`, inv.cgst] as [string, number], [`SGST @ ${inv.gst_rate / 2}%`, inv.sgst] as [string, number]])];
  return (
    <article className="card mx-auto max-w-3xl p-6 sm:p-10 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div><div className="display text-2xl font-semibold">{seller.name}</div><div className="text-sm text-ink2">{seller.addr}</div>{seller.gstin && <div className="text-sm">GSTIN {seller.gstin}</div>}</div>
        <div className="text-right"><div className="display text-xl font-medium">{sale ? "Tax invoice" : "Supplier bill"}</div><div className="text-sm">No. <b>{inv.number}</b></div><div className="text-sm">Date {fdate(inv.date)}</div><div className="text-sm text-ink2">Due {fdate(inv.due_date)}</div></div>
      </div>
      <div className="grid gap-4 border-b border-line py-5 sm:grid-cols-2">
        <div><div className="text-xs font-medium text-ink2">BILL TO</div><div className="font-medium">{buyer.name}</div><div className="text-sm text-ink2">{buyer.addr}</div>{buyer.gstin && <div className="text-sm">GSTIN {buyer.gstin}</div>}</div>
        <div className="text-sm sm:text-right"><div><span className="text-ink2">Place of supply:</span> {STATES[inv.place_of_supply] ?? inv.place_of_supply} ({inv.place_of_supply})</div><div><span className="text-ink2">Order:</span> {inv.order?.number}</div>{vehicles.length > 0 && <div><span className="text-ink2">Vehicles:</span> {vehicles.join(", ")}</div>}</div>
      </div>
      <table className="tbl my-4"><thead><tr><th>Description</th><th>HSN</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
        <tbody><tr><td className="font-medium">{inv.material?.name}</td><td>{inv.material?.hsn}</td><td className="num">{num(inv.qty)} {inv.material?.unit}</td><td className="num">{inr(inv.rate, 2)}</td><td className="num">{inr(inv.taxable, 2)}</td></tr></tbody></table>
      <div className="ml-auto max-w-xs space-y-1 text-sm">{rows.map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-ink2">{l}</span><span className="tabular-nums">{inr(v, 2)}</span></div>)}<div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{inr(inv.total, 2)}</span></div></div>
      <p className="mt-4 text-sm"><span className="text-ink2">In words:</span> {words(inv.total)}</p>
      {sale && co.bank && <p className="mt-2 text-sm"><span className="text-ink2">Bank:</span> {co.bank}</p>}
      {sale && co.terms && <p className="mt-2 text-xs text-ink2">{co.terms}</p>}
      <p className="mt-6 text-xs text-ink2">Computer-generated document.</p>
    </article>
  );
}
