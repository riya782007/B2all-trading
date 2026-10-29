import type { Customer, Enquiry, Material, Offer } from "./types";

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const c = (id: string, name: string, phone: string, city: string, company: string, days: number, role: "customer" | "owner" = "customer"): Customer => ({
  id, name, phone, city, company, role, consent: { whatsapp: true, email: false, sms: false }, createdAt: d(days),
});

export const materials: Material[] = [
  { id: "m1", name: "Thermal coal", category: "Coal", note: "Grade and GCV as per lab report" },
  { id: "m2", name: "Coking coal", category: "Coal" },
  { id: "m3", name: "Iron ore fines", category: "Iron ore" },
  { id: "m4", name: "Ferro manganese", category: "Ferro alloys" },
  { id: "m5", name: "Silico manganese", category: "Ferro alloys" },
  { id: "m6", name: "Ferro chrome", category: "Ferro alloys" },
  { id: "m7", name: "HMS scrap", category: "Scrap" },
  { id: "m8", name: "Limestone", category: "Minerals" },
  { id: "m9", name: "Dolomite", category: "Minerals" },
];

export const customers: Customer[] = [
  c("owner", "Amit Gupta", "+919000000000", "Raigarh", "B2All Commo", 90, "owner"),
  c("c1", "Rakesh Jain", "+919810000001", "Raipur", "Jain Steel & Power", 40),
  c("c2", "Sunita Verma", "+919810000002", "Nagpur", "Vidarbha Alloys", 25),
  c("c3", "Imran Khan", "+919810000003", "Jamshedpur", "Khan Ferro Traders", 12),
  c("c4", "Pooja Mehta", "+919810000004", "Bhilai", "Mehta Sponge Iron", 6),
  c("c5", "Anil Sharma", "+919810000005", "Rourkela", "Sharma Castings", 2),
];

const it = (materialId: string, qty: number) => {
  const m = materials.find((x) => x.id === materialId)!;
  return { materialId, name: m.name, qty, unit: "MT" };
};
const e = (id: string, cu: Customer, status: Enquiry["status"], items: Enquiry["items"], days: number, note?: string): Enquiry => ({
  id, customerId: cu.id, customerName: cu.name, customerPhone: cu.phone, city: cu.city, status, items, note, createdAt: d(days),
});

export const enquiries: Enquiry[] = [
  e("e1", customers[5], "new", [it("m1", 500)], 0, "Delivery at Rourkela plant, weekly rake if possible"),
  e("e2", customers[4], "new", [it("m3", 1000), it("m8", 300)], 1),
  e("e3", customers[2], "quoted", [it("m4", 40), it("m5", 60)], 3),
  e("e4", customers[1], "confirmed", [it("m2", 800)], 9),
  e("e5", customers[3], "dispatched", [it("m6", 25)], 14),
  e("e6", customers[1], "closed", [it("m1", 600)], 35),
];

export const offers: Offer[] = [
  { id: "o1", title: "Thermal coal: fresh stock", body: "Fresh thermal coal stock available for immediate dispatch. Reply for today's rate.", code: "FRESH10", validTill: null, sentCount: 4 },
];
