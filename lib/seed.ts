import type { Store } from "./store";
import { addDays, today } from "./money";
import { STD_LEDGERS, addDelivery, createInvoice, createOrder, createParty, draftContract, recordExpense, recordMoney } from "./domain";
import type { Material, Role } from "./types";

/** Demo data for the in-memory mode only. The live database starts with just the basics. */
export const DEFAULT_ROLES: Omit<Role, "id">[] = [
  { name: "Finance manager", perms: { crm: ["view", "export"], sales: ["view", "create", "edit", "export"], purchase: ["view", "create", "edit", "export"], inventory: ["view", "create", "edit", "export"], accounts: ["view", "create", "edit", "export"], admin: ["view"] } },
  { name: "Accounts clerk", perms: { sales: ["view", "create"], purchase: ["view", "create"], inventory: ["view"], accounts: ["view", "create", "export"] } },
  { name: "Sales executive", perms: { crm: ["view", "create", "edit"], sales: ["view", "create"], inventory: ["view"] } },
  { name: "Store and dispatch", perms: { sales: ["view"], purchase: ["view"], inventory: ["view", "create"] } },
  { name: "Viewer", perms: { crm: ["view"], sales: ["view"], purchase: ["view"], inventory: ["view"], accounts: ["view"] } },
];
export const DEFAULT_MATERIALS: Omit<Material, "id">[] = [
  { name: "Thermal coal", category: "Coal", note: "Grade and GCV as per lab report", hsn: "2701", gst_rate: 18, unit: "MT", opening_qty: 400, opening_rate: 5300, active: true },
  { name: "Coking coal", category: "Coal", note: null, hsn: "2701", gst_rate: 18, unit: "MT", opening_qty: 0, opening_rate: 0, active: true },
  { name: "Iron ore fines", category: "Iron ore", note: null, hsn: "2601", gst_rate: 5, unit: "MT", opening_qty: 900, opening_rate: 2800, active: true },
  { name: "Ferro manganese", category: "Ferro alloys", note: null, hsn: "7202", gst_rate: 18, unit: "MT", opening_qty: 20, opening_rate: 72000, active: true },
  { name: "Silico manganese", category: "Ferro alloys", note: null, hsn: "7202", gst_rate: 18, unit: "MT", opening_qty: 40, opening_rate: 76000, active: true },
  { name: "Ferro chrome", category: "Ferro alloys", note: null, hsn: "7202", gst_rate: 18, unit: "MT", opening_qty: 0, opening_rate: 0, active: true },
  { name: "HMS scrap", category: "Scrap", note: null, hsn: "7204", gst_rate: 18, unit: "MT", opening_qty: 150, opening_rate: 31000, active: true },
  { name: "Limestone", category: "Minerals", note: null, hsn: "2521", gst_rate: 5, unit: "MT", opening_qty: 0, opening_rate: 0, active: true },
  { name: "Dolomite", category: "Minerals", note: null, hsn: "2518", gst_rate: 5, unit: "MT", opening_qty: 0, opening_rate: 0, active: true },
];

export async function seed(s: Store) {
  const d = (n: number) => addDays(today(), n);
  await s.insert("company", { id: "main", name: "B2 All Commo Trade Pvt. Ltd.", gstin: "22AAAAA0000A1Z5", state_code: "22", address: "Raigarh, Chhattisgarh 496001", phone: "+91 90000 00000", email: "accounts@example.com", bank: "Sample Bank · A/c 000000000000 · IFSC SAMP0000000", invoice_prefix: "B2A", terms: "Disputes subject to Raigarh jurisdiction." });
  for (const [name, grp] of STD_LEDGERS) await s.insert("ledgers", { name, grp, opening: name === "Bank" ? 2500000 : name === "Capital" ? -2500000 : 0 });
  const mats = []; for (const m of DEFAULT_MATERIALS) mats.push(await s.insert("materials", m));
  const roles = []; for (const r of DEFAULT_ROLES) roles.push(await s.insert("roles", r));
  const P = (id: string, name: string, role: "owner" | "staff" | "customer", extra = {}) => s.insert("profiles", { id, name, role, phone: "+91900000" + id.slice(-4).replace(/\D/g, "0").padStart(4, "0"), city: "Raigarh", ...extra });
  await P("demo-owner", "Amit Gupta", "owner", { email: "owner@example.com" });
  await P("demo-fin", "Priyansh", "staff", { staff_role_id: roles[0].id, email: "priyansh@example.com" });
  await P("demo-acc", "Accounts clerk", "staff", { staff_role_id: roles[1].id });
  await P("demo-store", "Store clerk", "staff", { staff_role_id: roles[3].id });
  const cust = await P("demo-cust", "Rakesh Jain", "customer", { company: "Jain Steel & Power", city: "Raipur", gstin: "22BBBBB1111B1Z2", state_code: "22", phone: "+919810000001" });
  const cust2 = await P("demo-cust2", "Sunita Verma", "customer", { company: "Vidarbha Alloys", city: "Nagpur", state_code: "27", phone: "+919810000002" });

  const by = "Sample data";
  const jain = await createParty(s, by, { name: "Jain Steel & Power", type: "customer", gstin: "22BBBBB1111B1Z2", city: "Raipur", phone: "+919810000001", profile_id: cust.id, credit_days: 15, email: "purchase@example.com" });
  const vid = await createParty(s, by, { name: "Vidarbha Alloys", type: "customer", state_code: "27", city: "Nagpur", phone: "+919810000002", profile_id: cust2.id, credit_days: 30 });
  const mehta = await createParty(s, by, { name: "Mehta Sponge Iron", type: "customer", state_code: "22", city: "Bhilai", phone: "+919810000004" });
  const mines = await createParty(s, by, { name: "Sample Mines Pvt Ltd", type: "supplier", gstin: "21CCCCC2222C1Z9", city: "Keonjhar", phone: "+919820000001" });
  const alloys = await createParty(s, by, { name: "Sample Ferro Works", type: "supplier", state_code: "22", city: "Raipur", phone: "+919820000002" });
  const [coal, , ore, fem, sim, , scrap] = mats;

  // Purchases: coal arriving in parts (Priyansh's case)
  const po1 = await createOrder(s, by, { kind: "purchase", party_id: mines.id, material_id: coal.id, qty: 2000, rate: 5400, date: d(-40) });
  for (const [n, dd, v, q, ew] of [["PB-8801", -36, "OD02EF9900", 500, -34], ["PB-8812", -29, "CG04AB1234", 400, -27], ["PB-8830", -12, "CG04AB1234", 300, -11]] as const)
    await addDelivery(s, by, { order_id: po1.id, bill_no: n, bill_date: d(dd), vehicle_no: v, qty: q, eway_no: "2710" + String(Math.abs(dd)).padStart(8, "0"), eway_valid_till: d(ew) });
  const po1d = await s.all("deliveries", { order_id: po1.id });
  await createInvoice(s, by, { order_id: po1.id, delivery_ids: po1d.slice(0, 2).map((x) => x.id), date: d(-26), supplier_bill_no: "SMPL/1187" });
  const po2 = await createOrder(s, by, { kind: "purchase", party_id: alloys.id, material_id: sim.id, qty: 100, rate: 78000, date: d(-30) });
  await addDelivery(s, by, { order_id: po2.id, bill_no: "SF-301", bill_date: d(-26), vehicle_no: "MH31CD5566", qty: 60, eway_no: "271000000041", eway_valid_till: d(-24) });

  // Sales to Jain Steel: coal in parts, invoices, payments
  const so1 = await createOrder(s, by, { kind: "sale", party_id: jain.id, material_id: coal.id, qty: 1000, rate: 6200, date: d(-21), terms: "Delivery at buyer's plant, Raipur." });
  for (const [n, dd, v, q, ew] of [["DC-501", -16, "CG04AB1234", 160, -15], ["DC-507", -12, "CG10XY7788", 150, -11], ["DC-513", -8, "CG04AB1234", 170, -7], ["DC-519", -4, "CG04AB1234", 140, -3], ["DC-524", -1, "MH31CD5566", 140, 1]] as const)
    await addDelivery(s, by, { order_id: so1.id, bill_no: n, bill_date: d(dd), vehicle_no: v, qty: q, eway_no: "2720" + String(Math.abs(dd)).padStart(8, "0"), eway_valid_till: d(ew) });
  const so1d = await s.all("deliveries", { order_id: so1.id });
  const inv1 = await createInvoice(s, by, { order_id: so1.id, delivery_ids: so1d.slice(0, 2).map((x) => x.id), date: d(-11) });
  await createInvoice(s, by, { order_id: so1.id, delivery_ids: so1d.slice(2, 4).map((x) => x.id), date: d(-3) });
  await recordMoney(s, by, { direction: "in", party_id: jain.id, amount: 1500000, mode: "Bank", date: d(-2), invoice_id: inv1.id });
  const c1 = await draftContract(s, by, so1.id);
  await s.update("contracts", c1.id, { status: "signed", sent_at: d(-21), signed_at: d(-20), signed_name: "Rakesh Jain", doc_hash: "sample" });
  const so0 = await createOrder(s, by, { kind: "sale", party_id: jain.id, material_id: coal.id, qty: 600, rate: 6000, date: d(-48) });
  await addDelivery(s, by, { order_id: so0.id, bill_no: "DC-480", bill_date: d(-45), vehicle_no: "CG04AB1234", qty: 600, eway_no: "272000000480", eway_valid_till: d(-44) });
  await setClosed(s, so0.id);
  const so2 = await createOrder(s, by, { kind: "sale", party_id: jain.id, material_id: scrap.id, qty: 120, rate: 33500, date: d(-2) });
  const c2 = await draftContract(s, by, so2.id);
  await s.update("contracts", c2.id, { status: "sent", sent_at: d(-1) });

  // Vidarbha (interstate, IGST), over-delivered order
  const so3 = await createOrder(s, by, { kind: "sale", party_id: vid.id, material_id: ore.id, qty: 600, rate: 3100, date: d(-18) });
  for (const [n, dd] of [["DC-510", -10], ["DC-522", -2]] as const) await addDelivery(s, by, { order_id: so3.id, bill_no: n, bill_date: d(dd), vehicle_no: "OD02EF9900", qty: 320, eway_no: "2730000000" + String(Math.abs(dd)).padStart(2, "0"), eway_valid_till: d(dd + 2) });
  const so3d = await s.all("deliveries", { order_id: so3.id });
  await createInvoice(s, by, { order_id: so3.id, delivery_ids: [so3d[0].id], date: d(-9) });
  await createOrder(s, by, { kind: "sale", party_id: mehta.id, material_id: fem.id, qty: 25, rate: 81000, date: d(-1) });

  await recordMoney(s, by, { direction: "out", party_id: mines.id, amount: 2000000, mode: "Bank", date: d(-20) });
  await recordExpense(s, by, { ledger: "Freight", amount: 42000, mode: "Bank", date: d(-10), narration: "Freight for DC-501 to DC-513" });

  // Website enquiries
  const e1 = await s.insert("enquiries", { customer_id: cust2.id, status: "new", note: "Need weekly rake if possible" });
  await s.insert("enquiry_items", { enquiry_id: e1.id, material_id: coal.id, qty: 500, unit: "MT" });
  const e2 = await s.insert("enquiries", { customer_id: cust.id, status: "new", note: null });
  await s.insert("enquiry_items", { enquiry_id: e2.id, material_id: ore.id, qty: 300, unit: "MT" });
  await s.insert("offers", { title: "Fresh thermal coal stock", body: "Fresh stock ready for dispatch this week. Reply for today's rate.", code: "FRESH" });
}
async function setClosed(s: Store, id: string) { await s.update("orders", id, { status: "closed" }); }
