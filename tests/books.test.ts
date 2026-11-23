import test from "node:test";
import assert from "node:assert/strict";
import { coalAdjustment, finalAccounts, gstReturns, groupOf, importTallyLedgers, natureOf, parseTallyMasters, postNote, primaryOf, reverseVoucher } from "../lib/books";
import { createParty, postVoucher, invoiceViews } from "../lib/domain";
import type { Table, Tables } from "../lib/types";
import type { Store } from "../lib/store";

function store(): Store {
  const rows = new Map<Table, unknown[]>(); const counters = new Map<string, number>();
  const all = <T extends Table>(t: T) => (rows.get(t) ?? []) as Tables[T][];
  return {
    async all(t, m) { return structuredClone(all(t).filter((r) => !m || Object.entries(m).every(([k, v]) => r[k as keyof typeof r] === v))); },
    async one(t, id) { return structuredClone(all(t).find((r) => (r as { id: string }).id === id) ?? null); },
    async insert(t, row) { const value = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row } as Tables[typeof t]; rows.set(t, [...all(t), value]); return structuredClone(value); },
    async update(t, id, patch) { Object.assign(all(t).find((r) => (r as { id: string }).id === id)!, patch); },
    async remove(t, id) { rows.set(t, all(t).filter((r) => (r as { id: string }).id !== id)); },
    async next(k) { const n = (counters.get(k) ?? 0) + 1; counters.set(k, n); return n; },
  };
}
async function books() {
  const s = store();
  await s.insert("company", { id: "main", name: "B2All", gstin: "22AAAAA0000A1Z5", state_code: "22", address: "", phone: "", email: "", bank: "", invoice_prefix: "B2A", terms: "" });
  const L = async (name: string, grp: string, opening = 0) => s.insert("ledgers", { name, grp, opening });
  const bank = await L("Bank", "Bank Accounts", 500000), cap = await L("Capital", "Capital Account", -500000);
  const sales = await L("Sales", "Sales Accounts"), rent = await L("Rent", "Indirect Expenses");
  for (const n of ["Output CGST", "Output SGST", "Output IGST", "Input CGST", "Input SGST", "Input IGST"]) await L(n, "Duties & Taxes");
  return { s, bank, cap, sales, rent };
}

test("Tally groups resolve to the right nature", () => {
  assert.equal(primaryOf("Sundry Debtors")?.name, "Current Assets");
  assert.equal(natureOf("Duties & Taxes"), "L");
  assert.equal(natureOf("Bank OD A/c"), "L");
  assert.equal(groupOf("sales accounts")?.gp, true);
  assert.equal(groupOf("Something odd"), null);
});

test("coal quality adjustment is pro-rata on GCV plus ash penalty", () => {
  const r = coalAdjustment({ qty: 100, rate: 6000, gcvContract: 5000, gcvActual: 4800, ashContract: 30, ashActual: 32, ashPenaltyPerPct: 20 });
  assert.equal(r.newRate, 5760); assert.equal(r.gcv, -24000); assert.equal(r.ash, -4000); assert.equal(r.total, -28000);
});

test("P&L and balance sheet tally, and a cash sale and rent flow through", async () => {
  const { s, bank, sales, rent } = await books();
  await postVoucher(s, "t", { type: "receipt", date: "2026-11-01", narration: "cash sale", entries: [{ ledger_id: bank.id, dr: 10000, cr: 0 }, { ledger_id: sales.id, dr: 0, cr: 10000 }] });
  await postVoucher(s, "t", { type: "payment", date: "2026-11-02", narration: "rent", entries: [{ ledger_id: rent.id, dr: 3000, cr: 0 }, { ledger_id: bank.id, dr: 0, cr: 3000 }] });
  const f = await finalAccounts(s);
  assert.equal(f.grossProfit, 10000); assert.equal(f.netProfit, 7000); assert.equal(f.balanced, true); assert.equal(f.openingDiff, 0);
});

test("credit note reverses output GST, reduces the bill and shows in GSTR-1/3B", async () => {
  const { s } = await books();
  const p = await createParty(s, "t", { name: "Jain Steel", type: "customer", gstin: "22BBBBB1111B1Z2" });
  const m = await s.insert("materials", { name: "Coal", category: "Coal", hsn: "2701", gst_rate: 5, unit: "MT", opening_qty: 0, opening_rate: 0, active: true });
  const o = await s.insert("orders", { number: "SO/1", kind: "sale", party_id: p.id, material_id: m.id, qty: 10, rate: 1000, date: "2026-11-01", status: "open" });
  const inv = await s.insert("invoices", { number: "B2A/1", kind: "sale", party_id: p.id, order_id: o.id, date: "2026-11-03", due_date: "2026-11-18", material_id: m.id, qty: 10, rate: 1000, gst_rate: 5, taxable: 10000, cgst: 250, sgst: 250, igst: 0, total: 10500, delivery_ids: [], place_of_supply: "22" });
  await postNote(s, "t", { kind: "credit_note", party_id: p.id, invoice_id: inv.id, date: "2026-11-05", taxable: 1000, gst_rate: 5, reason: "Coal quality (GCV / ash)" });
  const v = (await invoiceViews(s)).find((x) => x.id === inv.id)!;
  assert.equal(v.balance, 9450);
  const g = await gstReturns(s, "2026-11");
  assert.equal(g.cdnr.length, 1); assert.equal(g.cdnr[0].taxable, 1000); assert.equal(g.cdnr[0].cgst, 25);
  assert.equal(g.out.taxable, 9000); assert.equal(g.out.cgst, 225); assert.equal(g.payable.total, 450);
  await assert.rejects(() => postNote(s, "t", { kind: "debit_note", party_id: p.id, invoice_id: inv.id, date: "2026-11-05", taxable: 10, gst_rate: 5, reason: "x" }), /does not belong/);
});

test("books lock blocks entries on or before the date; reversal mirrors a voucher once", async () => {
  const { s, bank, rent } = await books();
  const v = await postVoucher(s, "t", { type: "payment", date: "2026-10-10", narration: "rent", entries: [{ ledger_id: rent.id, dr: 500, cr: 0 }, { ledger_id: bank.id, dr: 0, cr: 500 }] });
  const r = await reverseVoucher(s, "t", v.id, "2026-10-11");
  assert.deepEqual(r.entries.map((e) => [e.dr, e.cr]), [[0, 500], [500, 0]]);
  await assert.rejects(() => reverseVoucher(s, "t", v.id), /already been reversed/);
  await s.update("company", "main", { books_locked_till: "2026-10-31" });
  await assert.rejects(() => postVoucher(s, "t", { type: "payment", date: "2026-10-31", narration: "late", entries: [{ ledger_id: rent.id, dr: 1, cr: 0 }, { ledger_id: bank.id, dr: 0, cr: 1 }] }), /locked/);
});

test("Tally XML masters import: debit openings are negative in Tally, custom groups resolve to their parent", async () => {
  const xml = `<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA>
  <TALLYMESSAGE><GROUP NAME="Coal Buyers"><PARENT>Sundry Debtors</PARENT></GROUP></TALLYMESSAGE>
  <TALLYMESSAGE><LEDGER NAME="Mehta &amp; Sons"><PARENT>Coal Buyers</PARENT><OPENINGBALANCE>-25000.00</OPENINGBALANCE><PARTYGSTIN>22CCCCC2222C1Z9</PARTYGSTIN></LEDGER></TALLYMESSAGE>
  <TALLYMESSAGE><LEDGER NAME="HDFC Bank"><PARENT>Bank Accounts</PARENT><OPENINGBALANCE>-100000</OPENINGBALANCE></LEDGER></TALLYMESSAGE>
  <TALLYMESSAGE><LEDGER NAME="Bank"><PARENT>Bank Accounts</PARENT><OPENINGBALANCE>-1</OPENINGBALANCE></LEDGER></TALLYMESSAGE>
  </REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
  const { s } = await books();
  const r = parseTallyMasters(xml, (await s.all("ledgers")).map((l) => l.name));
  assert.equal(r.ledgers.length, 3);
  const m = r.ledgers.find((l) => l.name === "Mehta & Sons")!;
  assert.equal(m.group, "Sundry Debtors"); assert.equal(m.opening, 25000); assert.equal(m.gstin, "22CCCCC2222C1Z9");
  const res = await importTallyLedgers(s, "t", r.ledgers);
  assert.equal(res.created, 2); assert.deepEqual(res.skipped, ["Bank"]);
  assert.equal((await s.all("parties")).find((p) => p.name === "Mehta & Sons")?.type, "customer");
});
