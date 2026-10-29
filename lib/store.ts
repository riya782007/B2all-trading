import "server-only";
import { cookies } from "next/headers";
import { hasSupabase, supabaseServer } from "./supabase";
import * as demo from "./demo-data";
import type { Channel, Customer, Enquiry, Item, Material, Offer, Status } from "./types";

// Every function works in two modes: Supabase (when env vars are set) and an in-memory demo
// so the whole product can be seen and tried before any account is connected.
const mem = {
  customers: [...demo.customers],
  enquiries: [...demo.enquiries],
  offers: [...demo.offers],
  sends: [] as { offerId: string; customerId: string; channel: Channel }[],
};
let seq = 100;

const toCustomer = (p: Record<string, any>): Customer => ({
  id: p.id, name: p.name, phone: p.phone, city: p.city, company: p.company, role: p.role,
  consent: { whatsapp: p.consent_whatsapp, email: p.consent_email, sms: p.consent_sms }, createdAt: p.created_at,
});

export async function getUser(): Promise<Customer | null> {
  if (!hasSupabase) {
    const phone = (await cookies()).get("b2_demo")?.value;
    return mem.customers.find((x) => x.phone === phone) ?? null;
  }
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ? toCustomer(data) : null;
}

export async function listMaterials(): Promise<Material[]> {
  if (!hasSupabase) return demo.materials;
  const sb = await supabaseServer();
  const { data } = await sb.from("materials").select("id,name,category,note").eq("active", true).order("category");
  return data ?? [];
}

const mapEnquiry = (r: any): Enquiry => ({
  id: r.id, customerId: r.customer_id, customerName: r.profiles?.name ?? "", customerPhone: r.profiles?.phone ?? "",
  city: r.profiles?.city ?? "", status: r.status, note: r.note, createdAt: r.created_at,
  items: (r.enquiry_items ?? []).map((i: any) => ({ materialId: i.material_id, name: i.materials?.name ?? "", qty: Number(i.qty), unit: i.unit })),
});
const ENQ_SELECT = "id,customer_id,status,note,created_at,profiles(name,phone,city),enquiry_items(material_id,qty,unit,materials(name))";

export async function myEnquiries(userId: string): Promise<Enquiry[]> {
  if (!hasSupabase) return mem.enquiries.filter((x) => x.customerId === userId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const sb = await supabaseServer();
  const { data } = await sb.from("enquiries").select(ENQ_SELECT).eq("customer_id", userId).order("created_at", { ascending: false });
  return (data ?? []).map(mapEnquiry);
}

export async function allEnquiries(): Promise<Enquiry[]> {
  if (!hasSupabase) return [...mem.enquiries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const sb = await supabaseServer();
  const { data } = await sb.from("enquiries").select(ENQ_SELECT).order("created_at", { ascending: false }).limit(200);
  return (data ?? []).map(mapEnquiry);
}

export async function createEnquiry(user: Customer, items: { materialId: string; qty: number }[], note: string) {
  const mats = await listMaterials();
  const clean = items.filter((i) => i.qty > 0 && mats.some((m) => m.id === i.materialId));
  if (!clean.length) throw new Error("Add at least one material with a quantity.");
  if (!hasSupabase) {
    const full: Item[] = clean.map((i) => ({ materialId: i.materialId, name: mats.find((m) => m.id === i.materialId)!.name, qty: i.qty, unit: "MT" }));
    mem.enquiries.push({ id: `e${++seq}`, customerId: user.id, customerName: user.name, customerPhone: user.phone, city: user.city, status: "new", items: full, note, createdAt: new Date().toISOString() });
    return;
  }
  const sb = await supabaseServer();
  const { data, error } = await sb.from("enquiries").insert({ customer_id: user.id, note }).select("id").single();
  if (error) throw error;
  const { error: e2 } = await sb.from("enquiry_items").insert(clean.map((i) => ({ enquiry_id: data.id, material_id: i.materialId, qty: i.qty })));
  if (e2) throw e2;
}

export async function setStatus(id: string, status: Status) {
  if (!hasSupabase) { const x = mem.enquiries.find((e) => e.id === id); if (x) x.status = status; return; }
  const sb = await supabaseServer();
  await sb.from("enquiries").update({ status }).eq("id", id);
}

export async function listCustomers(): Promise<(Customer & { enquiryCount: number; lastEnquiry?: string })[]> {
  const enq = await allEnquiries();
  let rows: Customer[];
  if (!hasSupabase) rows = mem.customers.filter((x) => x.role === "customer");
  else {
    const sb = await supabaseServer();
    const { data } = await sb.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false });
    rows = (data ?? []).map(toCustomer);
  }
  // Without a phone code the same person can appear on two devices: show them once, by mobile number.
  const byPhone = new Map<string, Customer[]>();
  rows.forEach((r) => byPhone.set(r.phone, [...(byPhone.get(r.phone) ?? []), r]));
  return [...byPhone.values()].map((group) => {
    const r = [...group].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const mine = enq.filter((e) => group.some((g) => g.id === e.customerId));
    return { ...r, enquiryCount: mine.length, lastEnquiry: mine[0]?.createdAt };
  });
}

export async function upsertCustomer(p: { id?: string; phone: string; name: string; city: string; company?: string }) {
  if (!hasSupabase) {
    let x = mem.customers.find((c) => c.phone === p.phone);
    if (!x) { x = { id: `c${++seq}`, phone: p.phone, name: p.name, city: p.city, company: p.company, role: "customer", consent: { whatsapp: true, email: false, sms: false }, createdAt: new Date().toISOString() }; mem.customers.push(x); }
    else { x.name = p.name || x.name; x.city = p.city || x.city; }
    return x;
  }
  const sb = await supabaseServer();
  await sb.from("profiles").upsert({ id: p.id, phone: p.phone, name: p.name, city: p.city, company: p.company ?? null }, { onConflict: "id" });
}

export async function listOffers(): Promise<Offer[]> {
  if (!hasSupabase) return mem.offers.map((o) => ({ ...o, sentCount: new Set(mem.sends.filter((s) => s.offerId === o.id).map((s) => s.customerId)).size + (o.id === "o1" ? 4 : 0) }));
  const sb = await supabaseServer();
  const { data } = await sb.from("offers").select("id,title,body,code,valid_till,offer_sends(count)").order("created_at", { ascending: false });
  return (data ?? []).map((o: any) => ({ id: o.id, title: o.title, body: o.body, code: o.code, validTill: o.valid_till, sentCount: o.offer_sends?.[0]?.count ?? 0 }));
}

export async function createOffer(o: { title: string; body: string; code?: string; validTill?: string }): Promise<string> {
  if (!hasSupabase) { const id = `o${++seq}`; mem.offers.unshift({ id, title: o.title, body: o.body, code: o.code || null, validTill: o.validTill || null, sentCount: 0 }); return id; }
  const sb = await supabaseServer();
  const { data, error } = await sb.from("offers").insert({ title: o.title, body: o.body, code: o.code || null, valid_till: o.validTill || null }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function recordSends(offerId: string, customerIds: string[], channel: Channel) {
  if (!hasSupabase) { customerIds.forEach((customerId) => mem.sends.push({ offerId, customerId, channel })); return; }
  const sb = await supabaseServer();
  await sb.from("offer_sends").insert(customerIds.map((customer_id) => ({ offer_id: offerId, customer_id, channel })));
}

/** Simple, explainable recommendations: other materials in the categories this customer already asked about,
 *  then what other customers ask for most. */
export async function recommendations(userId: string): Promise<Material[]> {
  const [mats, mine, all] = await Promise.all([listMaterials(), myEnquiries(userId), allEnquiries()]);
  const had = new Set(mine.flatMap((e) => e.items.map((i) => i.materialId)));
  const cats = new Set(mats.filter((m) => had.has(m.id)).map((m) => m.category));
  const pop = new Map<string, number>();
  all.forEach((e) => e.items.forEach((i) => pop.set(i.materialId, (pop.get(i.materialId) ?? 0) + 1)));
  return mats.filter((m) => !had.has(m.id))
    .sort((a, b) => Number(cats.has(b.category)) - Number(cats.has(a.category)) || (pop.get(b.id) ?? 0) - (pop.get(a.id) ?? 0))
    .slice(0, 3);
}

export async function offerRecipients(offerId: string): Promise<(Customer & { channel: Channel })[]> {
  if (!hasSupabase) {
    return mem.sends.filter((s) => s.offerId === offerId).map((s) => ({ ...mem.customers.find((c) => c.id === s.customerId)!, channel: s.channel })).filter((c) => c.id);
  }
  const sb = await supabaseServer();
  const { data } = await sb.from("offer_sends").select("channel,profiles(*)").eq("offer_id", offerId);
  return (data ?? []).map((r: any) => ({ ...toCustomer(r.profiles), channel: r.channel }));
}
