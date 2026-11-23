import "server-only";
import type { Store } from "./store";
import { balances, company, invoiceViews, partyLedger, postVoucher, stock, createParty } from "./domain";
import { gstSplit, r2, stateFromGstin, today, validDate } from "./money";
import type { Entry, Ledger, Party, Voucher, VType } from "./types";

/* ───────────── Tally's 28 predefined groups (15 primary + 13 sub-groups) ───────────── */
export type Nature = "A" | "L" | "I" | "E";
export const GROUPS: { name: string; parent: string | null; nature: Nature; gp?: boolean }[] = [
  { name: "Branch / Divisions", parent: null, nature: "L" },
  { name: "Capital Account", parent: null, nature: "L" },
  { name: "Current Assets", parent: null, nature: "A" },
  { name: "Current Liabilities", parent: null, nature: "L" },
  { name: "Direct Expenses", parent: null, nature: "E", gp: true },
  { name: "Direct Incomes", parent: null, nature: "I", gp: true },
  { name: "Fixed Assets", parent: null, nature: "A" },
  { name: "Indirect Expenses", parent: null, nature: "E" },
  { name: "Indirect Incomes", parent: null, nature: "I" },
  { name: "Investments", parent: null, nature: "A" },
  { name: "Loans (Liability)", parent: null, nature: "L" },
  { name: "Misc. Expenses (ASSET)", parent: null, nature: "A" },
  { name: "Purchase Accounts", parent: null, nature: "E", gp: true },
  { name: "Sales Accounts", parent: null, nature: "I", gp: true },
  { name: "Suspense A/c", parent: null, nature: "L" },
  { name: "Bank Accounts", parent: "Current Assets", nature: "A" },
  { name: "Bank OD A/c", parent: "Loans (Liability)", nature: "L" },
  { name: "Cash-in-Hand", parent: "Current Assets", nature: "A" },
  { name: "Deposits (Asset)", parent: "Current Assets", nature: "A" },
  { name: "Duties & Taxes", parent: "Current Liabilities", nature: "L" },
  { name: "Loans & Advances (Asset)", parent: "Current Assets", nature: "A" },
  { name: "Provisions", parent: "Current Liabilities", nature: "L" },
  { name: "Reserves & Surplus", parent: "Capital Account", nature: "L" },
  { name: "Secured Loans", parent: "Loans (Liability)", nature: "L" },
  { name: "Stock-in-Hand", parent: "Current Assets", nature: "A" },
  { name: "Sundry Creditors", parent: "Current Liabilities", nature: "L" },
  { name: "Sundry Debtors", parent: "Current Assets", nature: "A" },
  { name: "Unsecured Loans", parent: "Loans (Liability)", nature: "L" },
];
const G = new Map(GROUPS.map((g) => [g.name.toLowerCase(), g]));
/** Tally aliases people commonly type, mapped to the predefined name. */
const ALIAS: Record<string, string> = { "bank od a/c": "Bank OD A/c", "bank occ a/c": "Bank OD A/c", "loans (liability)": "Loans (Liability)", "misc. expenses (asset)": "Misc. Expenses (ASSET)", "suspense a/c": "Suspense A/c", "branch/divisions": "Branch / Divisions", "direct income": "Direct Incomes", "indirect income": "Indirect Incomes" };
export function groupOf(name: string) { const k = name.trim().toLowerCase(); return G.get(k) ?? G.get((ALIAS[k] ?? "").toLowerCase()) ?? null; }
export function primaryOf(name: string) { let g = groupOf(name); while (g?.parent) g = groupOf(g.parent); return g; }
export const natureOf = (grp: string): Nature => primaryOf(grp)?.nature ?? "A";
export const isCashBank = (l?: Ledger | null) => !!l && ["Bank Accounts", "Cash-in-Hand", "Bank OD A/c"].includes(l.grp);
export const VLABEL: Record<VType, string> = { sales: "Sales", purchase: "Purchase", receipt: "Receipt", payment: "Payment", journal: "Journal", contra: "Contra", credit_note: "Credit Note", debit_note: "Debit Note" };
export const VKEY: Partial<Record<VType, string>> = { contra: "F4", payment: "F5", receipt: "F6", journal: "F7", sales: "F8", purchase: "F9", credit_note: "Ctrl+F8", debit_note: "Ctrl+F9" };

const inRange = (d: string, from?: string, to?: string) => (!from || d >= from) && (!to || d <= to);

/** Closing balance of every ledger up to a date (Dr positive). */
export async function balancesAsOf(s: Store, to?: string) {
  const [ls, vs] = await Promise.all([s.all("ledgers"), s.all("vouchers")]);
  const m = new Map(ls.map((l) => [l.id, { ...l, dr: 0, cr: 0, closing: Number(l.opening) || 0 }]));
  for (const v of vs) if (inRange(v.date, undefined, to)) for (const e of v.entries) { const x = m.get(e.ledger_id); if (x) { x.dr = r2(x.dr + e.dr); x.cr = r2(x.cr + e.cr); x.closing = r2(x.closing + e.dr - e.cr); } }
  return [...m.values()];
}

/* ───────────── Profit & Loss and Balance Sheet (from the start of the books to today) ───────────── */
export async function finalAccounts(s: Store) {
  const [rows, st] = await Promise.all([balancesAsOf(s), stock(s)]);
  const mats = await s.all("materials");
  const openingStock = r2(mats.reduce((t, m) => t + Number(m.opening_qty) * Number(m.opening_rate), 0));
  const closingStock = r2(st.reduce((t, m) => t + m.value, 0));
  const byPrimary = (nature: Nature, gp?: boolean) => {
    const out = new Map<string, { group: string; amount: number; ledgers: { id: string; name: string; amount: number }[] }>();
    for (const r of rows) {
      const p = primaryOf(r.grp); if (!p || p.nature !== nature || (gp !== undefined && !!p.gp !== gp)) continue;
      const amt = nature === "A" || nature === "E" ? r.closing : -r.closing; if (!amt) continue;
      const g = out.get(p.name) ?? { group: p.name, amount: 0, ledgers: [] };
      g.amount = r2(g.amount + amt); g.ledgers.push({ id: r.id, name: r.name, amount: amt }); out.set(p.name, g);
    }
    return [...out.values()];
  };
  const sum = (a: { amount: number }[]) => r2(a.reduce((t, x) => t + x.amount, 0));
  const dExp = byPrimary("E", true), dInc = byPrimary("I", true), iExp = byPrimary("E", false), iInc = byPrimary("I", false);
  const grossProfit = r2(sum(dInc) + closingStock - openingStock - sum(dExp));
  const netProfit = r2(grossProfit + sum(iInc) - sum(iExp));
  const assets = byPrimary("A"), liabilities = byPrimary("L");
  const openingDiff = r2(rows.reduce((t, r) => t + (Number(r.opening) || 0), 0) + openingStock);
  const assetTotal = r2(sum(assets) + closingStock + (openingDiff < 0 ? -openingDiff : 0));
  const liabTotal = r2(sum(liabilities) + netProfit + (openingDiff > 0 ? openingDiff : 0));
  return { openingStock, closingStock, dExp, dInc, iExp, iInc, grossProfit, netProfit, assets, liabilities, openingDiff, assetTotal, liabTotal, balanced: assetTotal === liabTotal };
}

/* ───────────── GST returns from the books ───────────── */
const TAX_OUT = ["Output CGST", "Output SGST", "Output IGST"], TAX_IN = ["Input CGST", "Input SGST", "Input IGST"];
function noteTax(v: Voucher, L: Map<string, Ledger>, heads: string[]) {
  const pick = (n: string) => r2(v.entries.filter((e) => L.get(e.ledger_id)?.name === n).reduce((t, e) => t + e.dr + e.cr, 0));
  const [cgst, sgst, igst] = heads.map(pick);
  return { cgst, sgst, igst, taxable: r2(v.amount - cgst - sgst - igst) };
}
export async function gstReturns(s: Store, month: string) {
  const [inv, vs, ls, parties] = await Promise.all([invoiceViews(s), s.all("vouchers"), s.all("ledgers"), s.all("parties")]);
  const co = await company(s);
  const L = new Map(ls.map((l) => [l.id, l]));
  const sales = inv.filter((i) => i.kind === "sale" && i.date.startsWith(month)), purch = inv.filter((i) => i.kind === "purchase" && i.date.startsWith(month));
  const gstinOf = (i: (typeof inv)[number]) => i.party_snapshot?.gstin || i.party?.gstin || "";
  const b2b = sales.filter((i) => gstinOf(i));
  const b2cl = sales.filter((i) => !gstinOf(i) && i.place_of_supply !== co.state_code && Number(i.total) > 100000);
  const b2csRows = sales.filter((i) => !gstinOf(i) && !b2cl.includes(i));
  const b2cs = [...new Map(b2csRows.map((i) => [`${i.place_of_supply}|${i.gst_rate}`, { pos: i.place_of_supply, rate: Number(i.gst_rate), taxable: 0, igst: 0, cgst: 0, sgst: 0 }])).values()].map((g) => {
    const of = b2csRows.filter((i) => i.place_of_supply === g.pos && Number(i.gst_rate) === g.rate);
    return { ...g, taxable: r2(of.reduce((t, i) => t + Number(i.taxable), 0)), igst: r2(of.reduce((t, i) => t + Number(i.igst), 0)), cgst: r2(of.reduce((t, i) => t + Number(i.cgst), 0)), sgst: r2(of.reduce((t, i) => t + Number(i.sgst), 0)) };
  });
  const notes = (type: VType, heads: string[]) => vs.filter((v) => v.type === type && v.date.startsWith(month)).map((v) => {
    const p = parties.find((x) => x.id === v.party_id); const against = inv.find((i) => i.id === v.invoice_id);
    return { id: v.id, number: v.number, date: v.date, party: p?.name ?? "", gstin: p?.gstin ?? "", against: against?.number ?? "", ...noteTax(v, L, heads), total: Number(v.amount) };
  });
  const cdnr = notes("credit_note", TAX_OUT), dn = notes("debit_note", TAX_IN);
  const hsnMap = new Map<string, { hsn: string; name: string; unit: string; qty: number; taxable: number; igst: number; cgst: number; sgst: number }>();
  for (const i of sales) {
    const h = i.material_snapshot?.hsn || i.material?.hsn || ""; const k = h + (i.material_snapshot?.unit || i.material?.unit || "");
    const x = hsnMap.get(k) ?? { hsn: h, name: i.material_snapshot?.name || i.material?.name || "", unit: i.material_snapshot?.unit || i.material?.unit || "", qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
    x.qty = r2(x.qty + Number(i.qty)); x.taxable = r2(x.taxable + Number(i.taxable)); x.igst = r2(x.igst + Number(i.igst)); x.cgst = r2(x.cgst + Number(i.cgst)); x.sgst = r2(x.sgst + Number(i.sgst)); hsnMap.set(k, x);
  }
  const t = <T extends Record<string, unknown>>(a: T[], k: keyof T) => r2(a.reduce((n, x) => n + Number(x[k] || 0), 0));
  const out = { taxable: r2(t(sales, "taxable") - t(cdnr, "taxable")), igst: r2(t(sales, "igst") - t(cdnr, "igst")), cgst: r2(t(sales, "cgst") - t(cdnr, "cgst")), sgst: r2(t(sales, "sgst") - t(cdnr, "sgst")) };
  const itc = { taxable: r2(t(purch, "taxable") - t(dn, "taxable")), igst: r2(t(purch, "igst") - t(dn, "igst")), cgst: r2(t(purch, "cgst") - t(dn, "cgst")), sgst: r2(t(purch, "sgst") - t(dn, "sgst")) };
  // Set-off in the order the GST law requires: IGST credit first against IGST, then CGST, then SGST; CGST credit never against SGST and vice versa.
  let iI = itc.igst, iC = itc.cgst, iS = itc.sgst; let pI = out.igst, pC = out.cgst, pS = out.sgst;
  const setOff = (bal: number, need: number) => { const x = Math.min(bal, need); return [r2(bal - x), r2(need - x)]; };
  [iI, pI] = setOff(iI, pI); [iI, pC] = setOff(iI, pC); [iI, pS] = setOff(iI, pS); [iC, pC] = setOff(iC, pC); [iC, pI] = setOff(iC, pI); [iS, pS] = setOff(iS, pS); [iS, pI] = setOff(iS, pI);
  const payable = { igst: pI, cgst: pC, sgst: pS, total: r2(pI + pC + pS) }, carry = { igst: iI, cgst: iC, sgst: iS, total: r2(iI + iC + iS) };
  return { month, b2b, b2cl, b2cs, cdnr, dn, hsn: [...hsnMap.values()], out, itc, payable, carry, purchases: purch, counts: { sales: sales.length, purchases: purch.length } };
}

/* ───────────── Bank reconciliation ───────────── */
export async function bankBook(s: Store, ledgerId: string) {
  const [l, vs, reco] = await Promise.all([s.one("ledgers", ledgerId), s.all("vouchers"), s.all("bank_reco", { ledger_id: ledgerId })]);
  if (!l) return null;
  const parties = await s.all("parties");
  const lines = vs.flatMap((v) => v.entries.filter((e) => e.ledger_id === ledgerId).map((e) => {
    const r = reco.find((x) => x.voucher_id === v.id);
    return { voucher: v, party: parties.find((p) => p.id === v.party_id)?.name ?? "", dr: e.dr, cr: e.cr, bank_date: r?.bank_date ?? null, reco_id: r?.id ?? null };
  })).sort((a, b) => a.voucher.date.localeCompare(b.voucher.date));
  const books = r2((Number(l.opening) || 0) + lines.reduce((t, x) => t + x.dr - x.cr, 0));
  const notInBankDeposits = r2(lines.filter((x) => !x.bank_date && x.dr).reduce((t, x) => t + x.dr, 0));
  const notInBankCheques = r2(lines.filter((x) => !x.bank_date && x.cr).reduce((t, x) => t + x.cr, 0));
  return { ledger: l, lines, books, notInBankDeposits, notInBankCheques, asPerBank: r2(books - notInBankDeposits + notInBankCheques) };
}
export async function setBankDate(s: Store, by: string, voucherId: string, ledgerId: string, bankDate: string | null, ref?: string) {
  const existing = (await s.all("bank_reco", { voucher_id: voucherId, ledger_id: ledgerId }))[0];
  if (!bankDate) { if (existing) await s.remove("bank_reco", existing.id); return; }
  if (!validDate(bankDate)) throw new Error("Enter a valid bank date.");
  if (existing) await s.update("bank_reco", existing.id, { bank_date: bankDate, statement_ref: ref ?? existing.statement_ref ?? null });
  else await s.insert("bank_reco", { voucher_id: voucherId, ledger_id: ledgerId, bank_date: bankDate, statement_ref: ref ?? null, created_by: by });
}

/* ───────────── Credit and debit notes (sales returns, rate difference, coal quality) ───────────── */
export type NoteInput = { kind: "credit_note" | "debit_note"; party_id: string; invoice_id?: string; date: string; taxable: number; gst_rate: number; reason: string; narration?: string; request_id?: string };
export async function postNote(s: Store, by: string, d: NoteInput) {
  const p = await s.one("parties", d.party_id); if (!p) throw new Error("Choose a party.");
  if (!(d.taxable > 0) || !Number.isFinite(d.taxable)) throw new Error("Enter the amount before GST.");
  if (!Number.isFinite(d.gst_rate) || d.gst_rate < 0 || d.gst_rate > 28) throw new Error("Enter a valid GST rate.");
  const co = await company(s);
  const ps = p.state_code || stateFromGstin(p.gstin); if (!ps || !co.state_code) throw new Error("Set the party's state (or GSTIN) and the company state first.");
  if (d.invoice_id) { const i = await s.one("invoices", d.invoice_id); if (!i || i.party_id !== p.id || i.kind !== (d.kind === "credit_note" ? "sale" : "purchase")) throw new Error("That bill does not belong to this party."); }
  const sp = gstSplit(d.taxable, d.gst_rate, ps === co.state_code);
  const L = async (n: string, grp: string) => ((await s.all("ledgers", { name: n }))[0] ?? (await s.insert("ledgers", { name: n, grp, opening: 0 }))).id;
  const pl = (await partyLedger(s, p)).id;
  const entries: Entry[] = d.kind === "credit_note"
    ? [{ ledger_id: await L("Sales", "Sales Accounts"), dr: d.taxable, cr: 0 }, { ledger_id: await L("Output CGST", "Duties & Taxes"), dr: sp.cgst, cr: 0 }, { ledger_id: await L("Output SGST", "Duties & Taxes"), dr: sp.sgst, cr: 0 }, { ledger_id: await L("Output IGST", "Duties & Taxes"), dr: sp.igst, cr: 0 }, { ledger_id: pl, dr: 0, cr: sp.total }]
    : [{ ledger_id: pl, dr: sp.total, cr: 0 }, { ledger_id: await L("Purchase", "Purchase Accounts"), dr: 0, cr: d.taxable }, { ledger_id: await L("Input CGST", "Duties & Taxes"), dr: 0, cr: sp.cgst }, { ledger_id: await L("Input SGST", "Duties & Taxes"), dr: 0, cr: sp.sgst }, { ledger_id: await L("Input IGST", "Duties & Taxes"), dr: 0, cr: sp.igst }];
  return postVoucher(s, by, { type: d.kind, date: d.date, party_id: p.id, invoice_id: d.invoice_id || null, request_id: d.request_id || crypto.randomUUID(), narration: `${d.reason}${d.narration ? ` · ${d.narration}` : ""}`, entries });
}

/** Coal quality settlement: GCV pro-rata price, plus a penalty for each percent of ash above the guarantee. Pure arithmetic, no AI. */
export function coalAdjustment(i: { qty: number; rate: number; gcvContract: number; gcvActual: number; ashContract?: number; ashActual?: number; ashPenaltyPerPct?: number }) {
  if (![i.qty, i.rate, i.gcvContract, i.gcvActual].every((x) => Number.isFinite(x) && x > 0)) throw new Error("Enter quantity, rate and both GCV values.");
  const newRate = r2((i.rate * i.gcvActual) / i.gcvContract);
  const gcv = r2((newRate - i.rate) * i.qty);
  const ashOver = Math.max(0, (i.ashActual ?? 0) - (i.ashContract ?? 0));
  const ash = r2(-ashOver * (i.ashPenaltyPerPct ?? 0) * i.qty);
  return { newRate, gcv, ash, total: r2(gcv + ash) };
}

/* ───────────── Reversal (Tally's "cancel" without deleting history) ───────────── */
export async function reverseVoucher(s: Store, by: string, id: string, date = today()) {
  const v = await s.one("vouchers", id); if (!v) throw new Error("Voucher not found.");
  if (v.invoice_id) throw new Error("This voucher is linked to a bill. Use a credit or debit note against the bill instead.");
  if ((await s.all("vouchers")).some((x) => x.narration.startsWith(`Reversal of ${v.number} `))) throw new Error("This voucher has already been reversed.");
  return postVoucher(s, by, { type: "journal", date, party_id: v.party_id, request_id: crypto.randomUUID(), narration: `Reversal of ${v.number} (${VLABEL[v.type]}) · ${v.narration}`.slice(0, 500), entries: v.entries.map((e) => ({ ledger_id: e.ledger_id, dr: e.cr, cr: e.dr })) });
}

/* ───────────── Import ledger masters and opening balances from Tally XML ───────────── */
const unxml = (x: string) => x.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
const tag = (block: string, t: string) => { const m = block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i")); return m ? unxml(m[1]) : ""; };
export type TallyLedger = { name: string; group: string; tallyParent: string; opening: number; gstin: string; state: string; address: string; exists: boolean };
export function parseTallyMasters(xml: string, existing: string[]): { ledgers: TallyLedger[]; unknownGroups: string[] } {
  if (xml.length > 15_000_000) throw new Error("That file is too large. Export only ledger masters from Tally.");
  const groups = new Map<string, string>();
  for (const m of xml.matchAll(/<GROUP\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/GROUP>/gi)) groups.set(unxml(m[1]).toLowerCase(), tag(m[2], "PARENT"));
  const resolve = (g: string): string | null => { let cur = g; for (let i = 0; i < 20 && cur; i++) { const known = groupOf(cur); if (known) return known.name; cur = groups.get(cur.toLowerCase()) ?? ""; } return null; };
  const have = new Set(existing.map((x) => x.toLowerCase())); const unknown = new Set<string>();
  const ledgers: TallyLedger[] = [];
  for (const m of xml.matchAll(/<LEDGER\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/LEDGER>/gi)) {
    const name = unxml(m[1]); if (!name) continue;
    const parent = tag(m[2], "PARENT"); const grp = resolve(parent);
    if (!grp) { unknown.add(parent || "(none)"); continue; }
    const ob = Number(tag(m[2], "OPENINGBALANCE").replace(/[^0-9.-]/g, "")) || 0;
    const address = [...m[2].matchAll(/<ADDRESS[^>]*>([\s\S]*?)<\/ADDRESS>/gi)].map((x) => unxml(x[1])).join(", ");
    ledgers.push({ name, group: grp, tallyParent: parent, opening: r2(-ob), gstin: (tag(m[2], "PARTYGSTIN") || tag(m[2], "GSTIN")).toUpperCase(), state: tag(m[2], "LEDSTATENAME") || tag(m[2], "STATENAME"), address, exists: have.has(name.toLowerCase()) });
  }
  return { ledgers, unknownGroups: [...unknown] };
}
export async function importTallyLedgers(s: Store, by: string, rows: TallyLedger[]) {
  let created = 0, updated = 0; const skipped: string[] = [];
  for (const r of rows) {
    const found = (await s.all("ledgers", { name: r.name }))[0];
    if (found) {
      if (!Number(found.opening) && r.opening) { await s.update("ledgers", found.id, { opening: r.opening }); updated++; } else skipped.push(r.name);
      continue;
    }
    if (r.group === "Sundry Debtors" || r.group === "Sundry Creditors") {
      const type = r.group === "Sundry Debtors" ? "customer" : "supplier";
      const p: Party = await createParty(s, by, { name: r.name, type, gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(r.gstin) ? r.gstin : null, address: r.address || null });
      const l = await partyLedger(s, p);
      if (r.opening) await s.update("ledgers", l.id, { opening: r.opening });
    } else await s.insert("ledgers", { name: r.name, grp: r.group, opening: r.opening, gstin: r.gstin || null });
    created++;
  }
  return { created, updated, skipped };
}
export async function ledgerExportXml(s: Store) {
  const [ls, parties] = await Promise.all([s.all("ledgers"), s.all("parties")]);
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = ls.map((l) => { const p = parties.find((x) => x.id === l.party_id); return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="${esc(l.name)}" ACTION="Create"><NAME.LIST><NAME>${esc(l.name)}</NAME></NAME.LIST><PARENT>${esc(l.grp)}</PARENT><OPENINGBALANCE>${-Number(l.opening) || 0}</OPENINGBALANCE>${p?.gstin || l.gstin ? `<PARTYGSTIN>${esc(p?.gstin || l.gstin || "")}</PARTYGSTIN>` : ""}${l.party_id ? "<ISBILLWISEON>Yes</ISBILLWISEON>" : ""}</LEDGER></TALLYMESSAGE>`; }).join("\n");
  return `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC><REQUESTDATA>\n${body}\n</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

/* ───────────── Day book with dates ───────────── */
export async function dayBook(s: Store, o: { from?: string; to?: string; type?: string }) {
  const vs = await s.all("vouchers");
  return vs.filter((v) => inRange(v.date, o.from, o.to) && (!o.type || o.type === "all" || v.type === o.type)).sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}
export { balances };
