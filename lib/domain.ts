import "server-only";
import type { Store } from "./store";
import { addDays, fy, gstSplit, moneyProduct, r2, stateFromGstin, today, validDate } from "./money";
import type { Company, Delivery, Entry, Invoice, Kind, Ledger, LedgerGroup, Material, Order, Party, Profile, VType } from "./types";

import { deliveryBalance, normaliseBillNo, q3, validateAllocations } from "./reconciliation";

/* ───────────────────────── basics ───────────────────────── */

export async function log(s: Store, by: string, what: string) {
  await s.insert("activity", { at: new Date().toISOString(), by_name: by, what });
}
export async function company(s: Store): Promise<Company> {
  return (await s.one("company", "main")) ?? { id: "main", name: "B2 All Commo Trade Pvt. Ltd.", gstin: "", state_code: "22", address: "Raigarh, Chhattisgarh", phone: "", email: "", bank: "", invoice_prefix: "B2A", terms: "" };
}
const pad = (n: number) => String(n).padStart(4, "0");
async function number(s: Store, kind: string, prefix: string, date = today()) {
  const f = fy(date);
  return `${prefix}/${f}/${pad(await s.next(`${kind}-${f}`))}`;
}

/* ───────────────────────── ledgers ───────────────────────── */

export const STD_LEDGERS: [string, LedgerGroup][] = [
  ["Sales", "Sales Accounts"], ["Purchase", "Purchase Accounts"],
  ["Output CGST", "Duties & Taxes"], ["Output SGST", "Duties & Taxes"], ["Output IGST", "Duties & Taxes"],
  ["Input CGST", "Duties & Taxes"], ["Input SGST", "Duties & Taxes"], ["Input IGST", "Duties & Taxes"],
  ["Bank", "Bank Accounts"], ["Cash", "Cash-in-Hand"], ["Freight", "Direct Expenses"], ["Office expenses", "Indirect Expenses"], ["Capital", "Capital Account"],
];
async function ledger(s: Store, name: string): Promise<Ledger> {
  const found = (await s.all("ledgers", { name }))[0];
  if (found) return found;
  const grp = STD_LEDGERS.find(([n]) => n === name)?.[1] ?? "Indirect Expenses";
  return s.insert("ledgers", { name, grp, opening: 0 });
}
export async function partyLedger(s: Store, p: Party): Promise<Ledger> {
  const found = (await s.all("ledgers", { party_id: p.id }))[0];
  if (found) return found;
  const taken = (await s.all("ledgers", { name: p.name }))[0];
  return s.insert("ledgers", { name: taken ? `${p.name} (${p.type})` : p.name, grp: p.type === "customer" ? "Sundry Debtors" : "Sundry Creditors", party_id: p.id, opening: 0 });
}

/* ───────────────────────── parties ───────────────────────── */

export async function createParty(s: Store, by: string, d: Partial<Party> & { name: string; type: Party["type"] }) {
  const p = await s.insert("parties", { credit_days: d.type === "customer" ? 15 : 30, ...d, state_code: d.state_code || stateFromGstin(d.gstin) || null });
  await partyLedger(s, p);
  await log(s, by, `Added ${p.type} ${p.name}`);
  return p;
}
export async function ensureCustomerParty(s: Store, prof: Profile) {
  const found = (await s.all("parties", { profile_id: prof.id }))[0];
  if (found) return found;
  return createParty(s, prof.name, { name: prof.company || prof.name, type: "customer", phone: prof.phone, city: prof.city, profile_id: prof.id, gstin: prof.gstin, state_code: prof.state_code || stateFromGstin(prof.gstin) });
}

/* ───────────────────────── orders and deliveries ───────────────────────── */

export type OrderView = Order & {
  party: Party; material: Material; deliveries: (Delivery & { running: number; billed: number; remaining: number })[];
  received: number; pending: number; over: number; pct: number; billed: number; unbilled: number; value: number;
};
export async function orderViews(s: Store, kind?: Kind): Promise<OrderView[]> {
  const [orders, parties, mats, dels, invs] = await Promise.all([s.all("orders"), s.all("parties"), s.all("materials"), s.all("deliveries"), s.all("invoices")]);
  return orders.filter((o) => !kind || o.kind === kind).map((o) => {
    let run = 0;
    const d = dels.filter((x) => x.order_id === o.id).sort((a, b) => a.bill_date.localeCompare(b.bill_date) || a.created_at.localeCompare(b.created_at)).map((x) => ({ ...x, ...deliveryBalance(x, invs), running: q3((run += Number(x.qty))) }));
    const received = q3(run);
    const billed = q3(invs.filter((i) => i.order_id === o.id).reduce((t, i) => t + Number(i.qty), 0));
    return {
      ...o, party: parties.find((p) => p.id === o.party_id)!, material: mats.find((m) => m.id === o.material_id)!, deliveries: d,
      received, pending: Math.max(q3(o.qty - received), 0), over: Math.max(q3(received - o.qty), 0),
      pct: Math.min(100, Math.round((received / Number(o.qty)) * 100)), billed, unbilled: q3(received - billed), value: r2(o.qty * o.rate),
    };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}
export const orderView = async (s: Store, id: string) => (await orderViews(s)).find((o) => o.id === id);

export async function createOrder(s: Store, by: string, d: { kind: Kind; party_id: string; material_id: string; qty: number; rate: number; number?: string; terms?: string; enquiry_id?: string; date?: string }) {
  if (!Number.isFinite(d.qty) || q3(d.qty) !== d.qty || !(d.qty > 0)) throw new Error("Quantity must be more than zero.");
  if (!Number.isFinite(d.rate) || !(d.rate >= 0)) throw new Error("Enter a rate.");
  const party = await s.one("parties", d.party_id), material = await s.one("materials", d.material_id);
  if (!party || party.type !== (d.kind === "sale" ? "customer" : "supplier")) throw new Error("Choose the correct customer or supplier.");
  if (!material?.active) throw new Error("Choose an active material.");
  const date = d.date || today();
  if (!validDate(date)) throw new Error("Enter a valid order date.");
  let num = d.number?.trim() || "";
  if (num) { if ((await s.all("orders", { number: num })).length) throw new Error(`Order number ${num} already exists.`); }
  else do { num = await number(s, d.kind === "sale" ? "so" : "po", d.kind === "sale" ? "SO" : "PO", date); } while ((await s.all("orders", { number: num })).length);
  const o = await s.insert("orders", { number: num, kind: d.kind, party_id: d.party_id, material_id: d.material_id, qty: d.qty, rate: d.rate, date, status: "open", terms: d.terms || null, enquiry_id: d.enquiry_id || null });
  await log(s, by, `Created ${d.kind} order ${num}`);
  return o;
}
export async function setOrderStatus(s: Store, by: string, id: string, status: "open" | "closed", note?: string) {
  const o = await s.one("orders", id); if (!o) return;
  await s.update("orders", id, { status, closed_note: note || null });
  await log(s, by, `${status === "closed" ? "Closed" : "Reopened"} ${o.number}${note ? `: ${note}` : ""}`);
}

export type DeliveryInput = { order_id: string; bill_no: string; bill_date: string; vehicle_no: string; qty: number; eway_no?: string; eway_valid_till?: string; note?: string };
export const EWAY_LIMIT = 50000;
export const cleanVehicle = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();
export async function checkDelivery(s: Store, i: DeliveryInput) {
  const errors: string[] = [], warnings: string[] = [];
  const o = await orderView(s, i.order_id);
  if (!o) return { errors: ["Choose an order."], warnings };
  if (o.status === "closed") errors.push(`${o.number} is closed.`);
  if (!i.bill_no.trim()) errors.push("Enter the bill or challan number.");
  if (!validDate(i.bill_date)) errors.push("Enter the date.");
  if (!Number.isFinite(i.qty) || q3(i.qty) !== i.qty || !(i.qty > 0)) errors.push("Quantity must be more than zero.");
  if (!i.vehicle_no.trim()) errors.push("Enter the vehicle number.");
  const all = await orderViews(s);
  const dup = all.filter((x) => x.party_id === o.party_id).flatMap((x) => x.deliveries).find((d) => d.bill_no.trim().toLowerCase() === i.bill_no.trim().toLowerCase());
  if (dup) errors.push(`Bill ${i.bill_no} is already entered for ${o.party.name}.`);
  if (i.vehicle_no && !/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(cleanVehicle(i.vehicle_no))) warnings.push("The vehicle number does not look like an Indian registration. Please check it.");
  const after = q3(o.received + (i.qty || 0));
  if (after > o.qty) warnings.push(`This takes ${o.number} to ${after} ${o.material.unit}, ${q3(after - o.qty)} more than the ordered ${o.qty}.`);
  if (i.qty * o.rate > EWAY_LIMIT && !i.eway_no) warnings.push("Value is above ₹50,000 but there is no e-way bill number.");
  if (i.eway_valid_till && i.bill_date && i.eway_valid_till < i.bill_date) warnings.push("The e-way bill ends before the bill date.");
  return { errors, warnings };
}
export async function addDelivery(s: Store, by: string, i: DeliveryInput) {
  const check = await checkDelivery(s, i);
  if (check.errors.length) throw new Error(check.errors.join(" "));
  const o = await s.one("orders", i.order_id);
  const d = await s.insert("deliveries", { order_id: i.order_id, bill_no: i.bill_no.trim(), bill_date: i.bill_date, vehicle_no: cleanVehicle(i.vehicle_no), qty: i.qty, eway_no: i.eway_no?.trim() || null, eway_valid_till: i.eway_valid_till || null, note: i.note || null, entered_by: by });
  await log(s, by, `${o?.kind === "sale" ? "Dispatched" : "Received"} ${i.qty} on ${o?.number} (bill ${i.bill_no}, ${cleanVehicle(i.vehicle_no)})`);
  return d;
}

/* ───────────────────────── vouchers (double entry) ───────────────────────── */

const VPREFIX: Record<VType, string> = { sales: "SAL", purchase: "PUR", receipt: "RCT", payment: "PMT", journal: "JRN", contra: "CNT", credit_note: "CRN", debit_note: "DBN" };
export const SETTLES = ["receipt", "payment", "credit_note", "debit_note"];
export type VoucherInput = { type: VType; date: string; party_id?: string | null; invoice_id?: string | null; narration: string; entries: Entry[]; number?: string; request_id?: string };
export async function postVoucher(s: Store, by: string, v: VoucherInput) {
  if (!validDate(v.date)) throw new Error("Enter a valid voucher date.");
  const lock = (await company(s)).books_locked_till;
  if (lock && v.date <= lock) throw new Error(`Books are locked up to ${lock}. Ask the owner to unlock that period first.`);
  const ledgers = await s.all("ledgers");
  if (v.entries.some((e) => !Number.isFinite(e.dr) || !Number.isFinite(e.cr) || e.dr < 0 || e.cr < 0 || (e.dr > 0 && e.cr > 0) || !ledgers.some((l) => l.id === e.ledger_id))) throw new Error("Each entry needs an existing ledger and a positive debit or credit, never both.");
  const entries = v.entries.filter((e) => e.dr || e.cr).map((e) => ({ ledger_id: e.ledger_id, dr: r2(e.dr), cr: r2(e.cr) }));
  const dr = r2(entries.reduce((t, e) => t + e.dr, 0)), cr = r2(entries.reduce((t, e) => t + e.cr, 0));
  if (!entries.length || dr <= 0) throw new Error("A voucher needs an amount.");
  if (dr !== cr) throw new Error(`Debit (${dr}) and credit (${cr}) must be equal.`);
  if (s.postVoucher) return s.postVoucher({ ...v, entries });
  if (v.request_id) { const existing = (await s.all("vouchers",{request_id:v.request_id}))[0]; if (existing) return existing; }
  const vch = await s.insert("vouchers", { ...(v.request_id ? {request_id:v.request_id} : {}), number: v.number || (await number(s, `v${v.type}`, VPREFIX[v.type], v.date)), type: v.type, date: v.date, party_id: v.party_id || null, invoice_id: v.invoice_id || null, narration: v.narration, entries, amount: dr, created_by: by, tally_exported: false });
  await log(s, by, `Posted ${v.type} voucher ${vch.number} for ${dr}`);
  return vch;
}
export async function recordMoney(s: Store, by: string, d: { direction: "in" | "out"; party_id: string; amount: number; mode: "Bank" | "Cash"; date: string; invoice_id?: string; narration?: string; request_id?: string }) {
  if (!Number.isFinite(d.amount) || !(d.amount > 0)) throw new Error("Enter an amount.");
  const p = await s.one("parties", d.party_id); if (!p) throw new Error("Choose a party.");
  if (d.request_id) { const existing = (await s.all("vouchers",{request_id:d.request_id}))[0]; if (existing) return existing; }
  if (d.invoice_id) {
    const inv = await s.one("invoices", d.invoice_id);
    if (!inv || inv.party_id !== p.id || inv.kind !== (d.direction === "in" ? "sale" : "purchase")) throw new Error("This bill does not belong to the selected party or payment direction.");
    const paid = (await s.all("vouchers",{invoice_id:inv.id})).filter(v=>SETTLES.includes(v.type)).reduce((n,v)=>n+v.amount,0);
    if (r2(d.amount) > r2(inv.total-paid)) throw new Error("This exceeds the bill balance. Record any advance separately on account.");
  }
  const pl = await partyLedger(s, p), cash = await ledger(s, d.mode);
  const entries = d.direction === "in" ? [{ ledger_id: cash.id, dr: d.amount, cr: 0 }, { ledger_id: pl.id, dr: 0, cr: d.amount }] : [{ ledger_id: pl.id, dr: d.amount, cr: 0 }, { ledger_id: cash.id, dr: 0, cr: d.amount }];
  return postVoucher(s, by, { type: d.direction === "in" ? "receipt" : "payment", date: d.date, party_id: p.id, invoice_id: d.invoice_id, request_id:d.request_id, narration: d.narration || `${d.direction === "in" ? "Received from" : "Paid to"} ${p.name} by ${d.mode.toLowerCase()}`, entries });
}
export async function recordExpense(s: Store, by: string, d: { ledger: string; amount: number; mode: "Bank" | "Cash"; date: string; narration: string; request_id?: string }) {
  const exp = await ledger(s, d.ledger), cash = await ledger(s, d.mode);
  return postVoucher(s, by, { type: "journal", request_id:d.request_id, date: d.date, narration: d.narration || d.ledger, entries: [{ ledger_id: exp.id, dr: d.amount, cr: 0 }, { ledger_id: cash.id, dr: 0, cr: d.amount }] });
}

/* ───────────────────────── invoices ───────────────────────── */

export type InvoiceInput = { order_id: string; delivery_ids: string[]; delivery_quantities?: Record<string, number>; date: string; supplier_bill_no?: string; rate?: number; request_id?: string; bill_total?: number };
export async function createInvoice(s: Store, by: string, d: InvoiceInput): Promise<Invoice> {
  if (s.postInvoice) return s.postInvoice(d);
  if (!validDate(d.date)) throw new Error("Enter a valid bill date.");
  if (d.request_id) { const existing = (await s.all("invoices", { request_id: d.request_id }))[0]; if (existing) return existing; }
  const o = await orderView(s, d.order_id); if (!o) throw new Error("Order not found.");
  const allocations = validateAllocations(o.deliveries, await s.all("invoices"), d.delivery_ids, d.delivery_quantities);
  const dels = o.deliveries.filter((x) => d.delivery_ids.includes(x.id));
  if (o.kind === "purchase" && !d.supplier_bill_no?.trim()) throw new Error("Enter the supplier's bill number.");
  const co = await company(s);
  if (o.kind === "purchase" && (await s.all("invoices", { party_id: o.party_id, kind: "purchase" })).some((i) => fy(i.date) === fy(d.date) && normaliseBillNo(i.number) === normaliseBillNo(d.supplier_bill_no!))) throw new Error("This supplier bill is already entered for this financial year.");
  const qty = q3(Object.values(allocations).reduce((t, x) => t + x, 0)), rate = d.rate ?? o.rate;
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Enter a valid non-negative bill rate.");
  const taxable = moneyProduct(qty, rate);
  const partyState = o.party.state_code || stateFromGstin(o.party.gstin);
  if (!partyState || !co.state_code) throw new Error("Set the company and party state before calculating GST.");
  const split = gstSplit(taxable, Number(o.material.gst_rate), partyState === co.state_code);
  if (d.bill_total !== undefined && (!Number.isFinite(d.bill_total) || Math.abs(r2(d.bill_total) - split.total) > 0.010001)) throw new Error("The printed bill total does not match the quantities, rate and GST. Check charges or deductions before posting.");
  const num = o.kind === "sale" ? await number(s, "inv", co.invoice_prefix || "INV", d.date) : d.supplier_bill_no!.trim();
  if (split.total <= 0) throw new Error("Bill total must be positive.");
  const inv = await s.insert("invoices", {
    number: num, kind: o.kind, party_id: o.party_id, order_id: o.id, date: d.date, due_date: addDays(d.date, o.party.credit_days ?? 15), material_id: o.material_id,
    company_snapshot: co, party_snapshot: o.party, material_snapshot: { name:o.material.name, hsn:o.material.hsn, unit:o.material.unit },
    qty, rate, gst_rate: Number(o.material.gst_rate), taxable, ...split, delivery_ids: dels.map((x) => x.id), delivery_quantities: allocations, ...(d.request_id ? { request_id: d.request_id } : {}), place_of_supply: o.kind === "sale" ? partyState : co.state_code,
  });
  for (const x of dels) if (allocations[x.id] === x.remaining) await s.update("deliveries", x.id, { invoice_id: inv.id });
  const pl = await partyLedger(s, o.party);
  const L = async (n: string) => (await ledger(s, n)).id;
  const entries: Entry[] = o.kind === "sale"
    ? [{ ledger_id: pl.id, dr: split.total, cr: 0 }, { ledger_id: await L("Sales"), dr: 0, cr: taxable }, { ledger_id: await L("Output CGST"), dr: 0, cr: split.cgst }, { ledger_id: await L("Output SGST"), dr: 0, cr: split.sgst }, { ledger_id: await L("Output IGST"), dr: 0, cr: split.igst }]
    : [{ ledger_id: await L("Purchase"), dr: taxable, cr: 0 }, { ledger_id: await L("Input CGST"), dr: split.cgst, cr: 0 }, { ledger_id: await L("Input SGST"), dr: split.sgst, cr: 0 }, { ledger_id: await L("Input IGST"), dr: split.igst, cr: 0 }, { ledger_id: pl.id, dr: 0, cr: split.total }];
  const v = await postVoucher(s, by, { type: o.kind === "sale" ? "sales" : "purchase", date: d.date, party_id: o.party_id, invoice_id: inv.id, narration: `${o.number} · ${qty} ${o.material.unit} ${o.material.name} @ ${rate}`, entries, number: o.kind === "sale" ? num : undefined });
  await s.update("invoices", inv.id, { voucher_id: v.id });
  await log(s, by, `${o.kind === "sale" ? "Raised invoice" : "Entered supplier bill"} ${num} for ${split.total}`);
  return inv;
}

export type InvoiceView = Invoice & { party: Party; material: Material; order: Order; paid: number; balance: number; status: "paid" | "part" | "unpaid"; overdue: number };
export async function invoiceViews(s: Store, kind?: Kind): Promise<InvoiceView[]> {
  const [invs, parties, mats, orders, vchs] = await Promise.all([s.all("invoices"), s.all("parties"), s.all("materials"), s.all("orders"), s.all("vouchers")]);
  const t = Date.now();
  return invs.filter((i) => !kind || i.kind === kind).map((i) => {
    const paid = r2(vchs.filter((v) => v.invoice_id === i.id && SETTLES.includes(v.type)).reduce((a, v) => a + Number(v.amount), 0));
    const balance = r2(Number(i.total) - paid);
    return { ...i, party: parties.find((p) => p.id === i.party_id)!, material: mats.find((m) => m.id === i.material_id)!, order: orders.find((o) => o.id === i.order_id)!, paid, balance, status: balance <= 0 ? "paid" : paid > 0 ? "part" : "unpaid", overdue: balance > 0 ? Math.max(0, Math.floor((t - +new Date(i.due_date)) / 864e5)) : 0 } as InvoiceView;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}

/* ───────────────────────── reports ───────────────────────── */

export async function balances(s: Store) {
  const [ls, vs] = await Promise.all([s.all("ledgers"), s.all("vouchers")]);
  const m = new Map(ls.map((l) => [l.id, { ...l, dr: 0, cr: 0, closing: Number(l.opening) || 0 }]));
  for (const v of vs) for (const e of v.entries) { const x = m.get(e.ledger_id); if (x) { x.dr = r2(x.dr + e.dr); x.cr = r2(x.cr + e.cr); x.closing = r2(x.closing + e.dr - e.cr); } }
  return [...m.values()].sort((a, b) => a.grp.localeCompare(b.grp) || a.name.localeCompare(b.name));
}
export async function trialBalance(s: Store) {
  const rows = (await balances(s)).filter((r) => r.closing !== 0);
  // As in Tally with inventory: opening stock is a debit in the trial balance (Stock-in-Hand), not a ledger of its own.
  const openingStock = r2((await s.all("materials")).reduce((t, m) => t + Number(m.opening_qty) * Number(m.opening_rate), 0));
  if (openingStock) rows.push({ id: "opening-stock", name: "Opening stock", grp: "Stock-in-Hand", opening: openingStock, party_id: null, dr: 0, cr: 0, closing: openingStock });
  const dr = r2(rows.reduce((t, r) => t + Math.max(r.closing, 0), 0)), cr = r2(rows.reduce((t, r) => t + Math.max(-r.closing, 0), 0));
  return { rows, dr, cr, ok: dr === cr };
}
export async function statement(s: Store, ledgerId: string) {
  const [l, vs] = await Promise.all([s.one("ledgers", ledgerId), s.all("vouchers")]);
  if (!l) return null;
  let run = Number(l.opening) || 0;
  const lines = vs.flatMap((v) => v.entries.filter((e) => e.ledger_id === ledgerId).map((e) => ({ v, dr: e.dr, cr: e.cr })))
    .sort((a, b) => a.v.date.localeCompare(b.v.date) || a.v.created_at.localeCompare(b.v.created_at))
    .map((x) => ({ ...x, run: (run = r2(run + x.dr - x.cr)) }));
  return { ledger: l, lines, closing: run };
}
export async function outstanding(s: Store, kind: Kind) {
  const inv = (await invoiceViews(s, kind)).filter((i) => i.balance > 0);
  const bucket = (d: number) => (d <= 0 ? "Not due" : d <= 30 ? "1-30 days" : d <= 60 ? "31-60 days" : d <= 90 ? "61-90 days" : "90+ days");
  const buckets = ["Not due", "1-30 days", "31-60 days", "61-90 days", "90+ days"].map((b) => ({ b, amt: r2(inv.filter((i) => bucket(i.overdue) === b).reduce((t, i) => t + i.balance, 0)) }));
  return { rows: inv.map((i) => ({ ...i, bucket: bucket(i.overdue) })), total: r2(inv.reduce((t, i) => t + i.balance, 0)), buckets };
}
export async function gstSummary(s: Store) {
  const inv = await s.all("invoices");
  const months = [...new Set(inv.map((i) => i.date.slice(0, 7)))].sort().reverse();
  return months.map((m) => {
    const of = (k: Kind) => inv.filter((i) => i.kind === k && i.date.startsWith(m));
    const tax = (a: Invoice[]) => r2(a.reduce((t, i) => t + Number(i.cgst) + Number(i.sgst) + Number(i.igst), 0));
    const out = tax(of("sale")), inp = tax(of("purchase"));
    return { month: m, sales: r2(of("sale").reduce((t, i) => t + Number(i.taxable), 0)), purchases: r2(of("purchase").reduce((t, i) => t + Number(i.taxable), 0)), output: out, input: inp, net: r2(out - inp) };
  });
}
export async function stock(s: Store) {
  const [mats, ov] = await Promise.all([s.all("materials"), orderViews(s)]);
  return mats.filter((m) => m.active).map((m) => {
    const of = ov.filter((o) => o.material_id === m.id);
    const pur = of.filter((o) => o.kind === "purchase"), sal = of.filter((o) => o.kind === "sale");
    const inQty = q3(pur.reduce((t, o) => t + o.received, 0)), outQty = q3(sal.reduce((t, o) => t + o.received, 0));
    const inVal = pur.reduce((t, o) => t + o.received * o.rate, 0) + Number(m.opening_qty) * Number(m.opening_rate);
    const avg = inQty + Number(m.opening_qty) > 0 ? r2(inVal / (inQty + Number(m.opening_qty))) : 0;
    const closing = q3(Number(m.opening_qty) + inQty - outQty);
    const pendIn = q3(pur.filter((o) => o.status === "open").reduce((t, o) => t + o.pending, 0));
    const pendOut = q3(sal.filter((o) => o.status === "open").reduce((t, o) => t + o.pending, 0));
    return { ...m, inQty, outQty, closing, pendIn, pendOut, projected: q3(closing + pendIn - pendOut), avg, value: r2(Math.max(closing, 0) * avg) };
  });
}

/* ───────────────────────── contracts ───────────────────────── */

export async function draftContract(s: Store, by: string, orderId: string) {
  const o = await orderView(s, orderId); if (!o) throw new Error("Order not found.");
  const existing = (await s.all("contracts", { order_id: orderId })).find((c) => c.status !== "cancelled");
  if (existing) return existing;
  const co = await company(s);
  const seller = o.kind === "sale" ? co.name : o.party.name, buyer = o.kind === "sale" ? o.party.name : co.name;
  const enq = o.enquiry_id ? await s.one("enquiries", o.enquiry_id) : null;
  const offer = enq?.offer_id ? await s.one("offers", enq.offer_id) : null;
  const body = [
    `SALE AND PURCHASE CONTRACT`, ``,
    `Contract for order ${o.number} dated ${o.date}.`, ``,
    `Seller: ${seller}`, `Buyer: ${buyer}${o.party.gstin && o.kind === "sale" ? ` (GSTIN ${o.party.gstin})` : ""}`, ``,
    `1. Material: ${o.material.name} (HSN ${o.material.hsn})${o.material.note ? `, ${o.material.note}` : ""}.`,
    `2. Quantity: ${o.qty} ${o.material.unit}. Deliveries may be made in parts against this order.`,
    `3. Rate: Rs ${o.rate} per ${o.material.unit}, exclusive of GST at ${o.material.gst_rate}%.`,
    `4. Payment: within ${o.party.credit_days} days of each invoice.`,
    `5. Quality: as per the agreed specification${o.material.note ? ` (${o.material.note})` : ""}, tested by an accredited laboratory on a sample drawn jointly at loading. For coal, the price moves pro-rata with GCV against the contracted GCV, and ash or moisture above the guarantee is deducted as agreed. Any difference is settled by a credit or debit note.`,
    `6. Weight: the loading-point weighbridge weight is final unless the buyer's weighbridge shows a difference of more than 0.5%, in which case both slips are compared before billing.`,
    `7. Dispatch and documents: each dispatch carries a tax invoice and, where required, a valid e-way bill. Risk passes to the buyer on delivery at the agreed point; title passes on full payment.`,
    `8. Late payment: amounts unpaid after the due date may carry interest at 18% a year.`,
    `9. Force majeure: neither party is liable for delay caused by events beyond its control (strikes, rake shortage, mine closure, natural calamity, government order), if the other party is told promptly.`,
    `10. Disputes: any dispute is settled by arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator, seated at Raigarh, Chhattisgarh, in English. Courts at Raigarh have jurisdiction.`,
    offer ? `11. Offer applied: ${offer.title}${offer.discount ? ` (${offer.discount})` : ""}${offer.code ? `, code ${offer.code}` : ""}.` : "",
    o.terms ? `${offer ? 12 : 11}. Other terms: ${o.terms}` : "",
    co.terms ? `\n${co.terms}` : "",
    ``, `Accepted electronically by the Buyer through the B2All customer portal.`,
  ].filter((x) => x !== "").join("\n");
  const c = await s.insert("contracts", { number: await number(s, "ct", "CT", o.date), order_id: o.id, party_id: o.party_id, body, status: "draft" });
  await log(s, by, `Drafted contract ${c.number} for ${o.number}`);
  return c;
}
export async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* ───────────────────────── customer insights ───────────────────────── */

export async function insights(s: Store, partyId: string) {
  const [ov, inv, mats] = await Promise.all([orderViews(s, "sale"), invoiceViews(s, "sale"), s.all("materials")]);
  const mine = ov.filter((o) => o.party_id === partyId);
  const myInv = inv.filter((i) => i.party_id === partyId);
  const f = fy();
  const spendFY = r2(myInv.filter((i) => fy(i.date) === f).reduce((t, i) => t + Number(i.total), 0));
  const totalQty = r2(mine.reduce((t, o) => t + Number(o.qty), 0));
  const byMat = mats.map((m) => ({ m, qty: r2(mine.filter((o) => o.material_id === m.id).reduce((t, o) => t + Number(o.qty), 0)) })).filter((x) => x.qty > 0).sort((a, b) => b.qty - a.qty);
  const dates = mine.map((o) => o.date).sort();
  const gaps = dates.slice(1).map((d, i) => (+new Date(d) - +new Date(dates[i])) / 864e5);
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
  const last = dates.at(-1) ?? null;
  const nextExpected = last && avgGap ? addDays(last, avgGap) : null;
  const now = new Date(); const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - (5 - i), 1)); return d.toISOString().slice(0, 7); });
  const monthly = months.map((mo) => ({ mo, qty: r2(mine.filter((o) => o.date.startsWith(mo)).reduce((t, o) => t + Number(o.qty), 0)) }));
  const cats = new Set(byMat.map((x) => x.m.category));
  const popular = new Map<string, number>(); ov.forEach((o) => popular.set(o.material_id, (popular.get(o.material_id) ?? 0) + 1));
  const recs = mats.filter((m) => m.active && !byMat.some((x) => x.m.id === m.id)).sort((a, b) => Number(cats.has(b.category)) - Number(cats.has(a.category)) || (popular.get(b.id) ?? 0) - (popular.get(a.id) ?? 0)).slice(0, 3);
  const outstandingAmt = r2(myInv.reduce((t, i) => t + i.balance, 0));
  return { orders: mine, invoices: myInv, spendFY, totalQty, byMat, avgGap, last, nextExpected, monthly, recs, outstanding: outstandingAmt, avgOrder: mine.length ? Math.round(totalQty / mine.length) : 0, top: byMat[0] ?? null };
}
