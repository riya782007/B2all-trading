import { r2 } from "./money";
import type { Ledger, Party, Voucher } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TYPE: Record<string, string> = { sales: "Sales", purchase: "Purchase", receipt: "Receipt", payment: "Payment", journal: "Journal", contra: "Contra", credit_note: "Credit Note", debit_note: "Debit Note" };

/** TallyPrime import file: ledger masters first, then vouchers. Import via Gateway of Tally → Import → Masters/Transactions.
 *  Tally treats debit amounts as negative and credit as positive with ISDEEMEDPOSITIVE flags. */
export function tallyXml(vouchers: Voucher[], ledgers: Ledger[], parties: Party[]) {
  const L = new Map(ledgers.map((l) => [l.id, l]));
  for (const v of vouchers) {
    if (!v.entries.length || v.entries.some(e=>!L.has(e.ledger_id) || !Number.isFinite(e.dr) || !Number.isFinite(e.cr) || e.dr<0 || e.cr<0 || (e.dr>0 && e.cr>0)) || r2(v.entries.reduce((t,e)=>t+e.dr-e.cr,0))!==0) throw new Error(`Voucher ${v.number} cannot be exported: check its ledgers and balance.`);
  }
  const used = new Set(vouchers.flatMap((v) => v.entries.map((e) => e.ledger_id)));
  const masters = ledgers.filter((l) => used.has(l.id)).map((l) => {
    const p = parties.find((x) => x.id === l.party_id);
    return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="${esc(l.name)}" ACTION="Create"><NAME.LIST><NAME>${esc(l.name)}</NAME></NAME.LIST><PARENT>${esc(l.grp)}</PARENT>${p?.gstin ? `<PARTYGSTIN>${esc(p.gstin)}</PARTYGSTIN>` : ""}${l.party_id ? "<ISBILLWISEON>Yes</ISBILLWISEON>" : ""}</LEDGER></TALLYMESSAGE>`;
  }).join("\n");
  const vch = vouchers.map((v) => `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER REMOTEID="${esc(v.id)}" VCHTYPE="${TYPE[v.type]}" ACTION="Create"><GUID>${esc(v.id)}</GUID><DATE>${v.date.replace(/-/g, "")}</DATE><VOUCHERTYPENAME>${TYPE[v.type]}</VOUCHERTYPENAME><VOUCHERNUMBER>${esc(v.number)}</VOUCHERNUMBER><NARRATION>${esc(v.narration)}</NARRATION>${v.entries.map((e) => {
    const l = L.get(e.ledger_id); const amt = e.dr ? -e.dr : e.cr;
    return `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${esc(l?.name ?? "")}</LEDGERNAME><ISDEEMEDPOSITIVE>${e.dr ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${amt}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
  }).join("")}</VOUCHER></TALLYMESSAGE>`).join("\n");
  const env = (body: string, report: string) => `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>${report}</REPORTNAME></REQUESTDESC><REQUESTDATA>\n${body}\n</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
  return { masters: env(masters, "All Masters"), vouchers: env(vch, "Vouchers") };
}
