"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasSupabase, supabaseServer } from "@/lib/supabase";
import { getStore } from "@/lib/store";
import { getMe, isStaff, mustStaff } from "@/lib/auth";
import * as D from "@/lib/domain";
import { aiWrite, hasGmail, sendMail } from "@/lib/integrations";
import { stateFromGstin, today } from "@/lib/money";
import type { Kind } from "@/lib/types";

export type FormState = { error?: string; warnings?: string[]; ok?: string; values?: Record<string, string>; text?: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(str(fd, k).replace(/,/g, ""));
const done = (path = "/owner") => { revalidatePath("/", "layout"); return path; };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

/* ───────── customers: sign in, enquiry, profile, contract ───────── */

function normalisePhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export async function customerLogin(prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name"), city = str(fd, "city"), raw = str(fd, "phone"), next = str(fd, "next");
  const values = { name, city, phone: raw, next };
  const phone = normalisePhone(raw);
  if (name.length < 2) return { error: "Please enter your name.", values };
  if (!phone) return { error: "Enter a valid 10-digit mobile number.", values };
  if (city.length < 2) return { error: "Please enter your city.", values };
  const s = await getStore();
  let id: string;
  if (hasSupabase) {
    const sb = await supabaseServer();
    let { data: { user } } = await sb.auth.getUser();
    if (!user) { const r = await sb.auth.signInAnonymously(); if (r.error || !r.data.user) return { error: "Sign-in is not available right now. Please try again shortly.", values }; user = r.data.user; }
    id = user.id;
    const existing = await s.one("profiles", id);
    if (existing) await s.update("profiles", id, { phone, name, city }); else await s.insert("profiles", { id, phone, name, city, role: "customer" });
  } else {
    const found = (await s.all("profiles", { phone })).find((p) => p.role === "customer");
    if (found) { id = found.id; await s.update("profiles", id, { name, city }); } else id = (await s.insert("profiles", { phone, name, city, role: "customer" })).id;
    (await cookies()).set("b2_session", id, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  }
  const prof = await s.one("profiles", id);
  if (prof && !(await s.all("parties", { profile_id: id })).length) await s.insert("parties", { name: prof.company || prof.name, type: "customer", phone, city, profile_id: id, credit_days: 15 });
  redirect(next.startsWith("/") ? next : "/account");
}

export async function signOut() {
  if (hasSupabase) await (await supabaseServer()).auth.signOut();
  (await cookies()).delete("b2_session");
  redirect("/");
}

export async function submitEnquiry(payload: string, note: string): Promise<FormState> {
  const me = await getMe();
  if (!me) redirect("/login?next=/basket");
  let items: { material_id: string; qty: number }[] = [];
  try { items = JSON.parse(payload); } catch { return { error: "Something went wrong. Please try again." }; }
  const s = await getStore();
  const mats = await s.all("materials");
  const clean = items.filter((i) => i.qty > 0 && mats.some((m) => m.id === i.material_id));
  if (!clean.length) return { error: "Add at least one material with a quantity." };
  const e = await s.insert("enquiries", { customer_id: me.profile.id, status: "new", note: note.slice(0, 500) || null });
  for (const i of clean) await s.insert("enquiry_items", { enquiry_id: e.id, material_id: i.material_id, qty: i.qty, unit: mats.find((m) => m.id === i.material_id)!.unit });
  revalidatePath("/account");
  return { ok: "sent" };
}

export async function updateMyProfile(_: FormState, fd: FormData): Promise<FormState> {
  const me = await getMe(); if (!me) redirect("/login");
  const s = await getStore();
  const gstin = str(fd, "gstin").toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return { error: "That GSTIN does not look right. It has 15 characters, like 22AAAAA0000A1Z5." };
  const patch = { name: str(fd, "name"), company: str(fd, "company") || null, city: str(fd, "city"), email: str(fd, "email") || null, gstin: gstin || null, state_code: stateFromGstin(gstin) || me.profile.state_code || null, address: str(fd, "address") || null };
  await s.update("profiles", me.profile.id, patch);
  const party = (await s.all("parties", { profile_id: me.profile.id }))[0];
  if (party) await s.update("parties", party.id, { name: patch.company || patch.name, gstin: patch.gstin, state_code: patch.state_code, email: patch.email, address: patch.address, city: patch.city });
  revalidatePath("/account");
  return { ok: "Saved" };
}

export async function signContract(contractId: string, _: FormState, fd: FormData): Promise<FormState> {
  const me = await getMe(); if (!me) redirect("/login");
  const signer = str(fd, "signer");
  if (signer.length < 3) return { error: "Type your full name to sign." };
  if (fd.get("agree") !== "on") return { error: "Tick the box to confirm you agree." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (hasSupabase) {
    const sb = await supabaseServer();
    const { error } = await sb.rpc("sign_contract", { cid: contractId, signer, ip });
    if (error) return { error: "This contract cannot be signed. It may already be signed or withdrawn." };
  } else {
    const s = await getStore();
    const c = await s.one("contracts", contractId); const party = c && (await s.one("parties", c.party_id));
    if (!c || !party || party.profile_id !== me.profile.id || c.status !== "sent") return { error: "This contract cannot be signed." };
    await s.update("contracts", c.id, { status: "signed", signed_at: new Date().toISOString(), signed_name: signer, signed_ip: ip, doc_hash: await D.sha256(c.body) });
    await D.log(s, me.profile.name, `Signed contract ${c.number}`);
  }
  revalidatePath("/", "layout");
  return { ok: "signed" };
}

/* ───────── staff sign-in ───────── */

export async function staffLogin(_: FormState, fd: FormData): Promise<FormState> {
  if (!hasSupabase) {
    (await cookies()).set("b2_session", str(fd, "demo") || "demo-owner", { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    redirect("/owner");
  }
  const sb = await supabaseServer();
  const email = str(fd, "email"), password = String(fd.get("password") ?? "");
  if (fd.get("mode") === "signup") {
    if (password.length < 8) return { error: "Use at least 8 characters for the password." };
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { ok: "Check your email and confirm it, then come back and sign in." };
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email or password is not correct." };
  const s = await getStore();
  let prof = await s.one("profiles", data.user.id);
  if (!prof) { await sb.rpc("claim_invite"); prof = await s.one("profiles", data.user.id); }
  if (!prof || (prof.role !== "owner" && prof.role !== "staff")) { await sb.auth.signOut(); return { error: "This email has not been given access yet. Ask an owner to add you under Team and roles." }; }
  redirect("/owner");
}

/* ───────── orders, deliveries, invoices, money ───────── */

export async function createOrderAction(_: FormState, fd: FormData): Promise<FormState> {
  const kind = (str(fd, "kind") === "purchase" ? "purchase" : "sale") as Kind;
  const me = await mustStaff(kind === "sale" ? "sales" : "purchase", "create");
  const s = await getStore();
  let id: string;
  try {
    const o = await D.createOrder(s, me.profile.name, { kind, party_id: str(fd, "party_id"), material_id: str(fd, "material_id"), qty: n(fd, "qty"), rate: n(fd, "rate"), number: str(fd, "number"), terms: str(fd, "terms"), date: str(fd, "date") || today(), enquiry_id: str(fd, "enquiry_id") || undefined });
    id = o.id;
    if (fd.get("contract") === "on" && kind === "sale") await D.draftContract(s, me.profile.name, o.id);
  } catch (e) { return { error: msg(e) }; }
  redirect(done(`/owner/orders/${id}`));
}
export async function setOrderStatusAction(id: string, status: "open" | "closed", fd: FormData) {
  const s = await getStore(); const o = await s.one("orders", id); if (!o) return;
  const me = await mustStaff(o.kind === "sale" ? "sales" : "purchase", "edit");
  await D.setOrderStatus(s, me.profile.name, id, status, str(fd, "note"));
  revalidatePath("/", "layout");
}

export async function saveDelivery(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("inventory", "create");
  const s = await getStore();
  const values = Object.fromEntries(["order_id", "bill_no", "bill_date", "vehicle_no", "qty", "eway_no", "eway_valid_till", "note"].map((k) => [k, str(fd, k)]));
  const input = { order_id: values.order_id, bill_no: values.bill_no, bill_date: values.bill_date, vehicle_no: values.vehicle_no, qty: Number(values.qty), eway_no: values.eway_no, eway_valid_till: values.eway_valid_till, note: values.note };
  const c = await D.checkDelivery(s, input);
  if (c.errors.length) return { error: c.errors.join(" "), values };
  if (c.warnings.length && fd.get("confirm") !== "yes") return { warnings: c.warnings, values };
  await D.addDelivery(s, me.profile.name, input);
  redirect(done(`/owner/orders/${input.order_id}?saved=delivery`));
}

export async function createInvoiceAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getStore(); const o = await s.one("orders", str(fd, "order_id"));
  if (!o) return { error: "Choose an order." };
  const me = await mustStaff(o.kind === "sale" ? "sales" : "purchase", "create");
  let id: string;
  try { id = (await D.createInvoice(s, me.profile.name, { order_id: o.id, delivery_ids: fd.getAll("delivery_id").map(String), date: str(fd, "date") || today(), supplier_bill_no: str(fd, "supplier_bill_no"), rate: str(fd, "rate") ? n(fd, "rate") : undefined })).id; }
  catch (e) { return { error: msg(e) }; }
  redirect(done(`/owner/invoices/${id}`));
}

export async function moneyAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "create");
  const s = await getStore(); const type = str(fd, "type");
  try {
    if (type === "expense") await D.recordExpense(s, me.profile.name, { ledger: str(fd, "ledger") || "Office expenses", amount: n(fd, "amount"), mode: str(fd, "mode") === "Cash" ? "Cash" : "Bank", date: str(fd, "date") || today(), narration: str(fd, "narration") });
    else await D.recordMoney(s, me.profile.name, { direction: type === "payment" ? "out" : "in", party_id: str(fd, "party_id"), amount: n(fd, "amount"), mode: str(fd, "mode") === "Cash" ? "Cash" : "Bank", date: str(fd, "date") || today(), invoice_id: str(fd, "invoice_id") || undefined, narration: str(fd, "narration") });
  } catch (e) { return { error: msg(e) }; }
  redirect(done("/owner/accounts?saved=1"));
}

/* ───────── contracts ───────── */

export async function draftContractAction(orderId: string) {
  const me = await mustStaff("sales", "create");
  const c = await D.draftContract(await getStore(), me.profile.name, orderId);
  redirect(done(`/owner/contracts/${c.id}`));
}
export async function saveContractBody(id: string, fd: FormData) {
  const me = await mustStaff("sales", "edit"); const s = await getStore();
  const c = await s.one("contracts", id); if (!c || c.status === "signed") return;
  await s.update("contracts", id, { body: str(fd, "body") }); await D.log(s, me.profile.name, `Edited contract ${c.number}`);
  revalidatePath("/", "layout");
}
export async function sendContractAction(id: string) {
  const me = await mustStaff("sales", "edit"); const s = await getStore();
  const c = await s.one("contracts", id); if (!c || c.status === "signed") return;
  await s.update("contracts", id, { status: "sent", sent_at: new Date().toISOString() });
  const p = await s.one("parties", c.party_id);
  const site = (await headers()).get("origin") ?? "";
  const mailed = p?.email ? await sendMail(p.email, `Contract ${c.number} from B2All for your signature`, `<p>Dear ${p.name},</p><p>Please review and sign contract <b>${c.number}</b> on your B2All page: <a href="${site}/account/contracts/${c.id}">${site}/account/contracts/${c.id}</a></p><p>Thank you,<br>B2All Commo</p>`) : false;
  await D.log(s, me.profile.name, `Sent contract ${c.number} for signing${mailed ? " by email" : ""}`);
  redirect(done(`/owner/contracts/${id}?sent=${mailed ? "email" : "portal"}`));
}

/* ───────── CRM ───────── */

export async function convertEnquiry(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("sales", "create"); const s = await getStore();
  const e = await s.one("enquiries", str(fd, "enquiry_id")); if (!e) return { error: "Enquiry not found." };
  const prof = await s.one("profiles", e.customer_id); if (!prof) return { error: "Customer not found." };
  const party = await D.ensureCustomerParty(s, prof);
  const items = await s.all("enquiry_items", { enquiry_id: e.id });
  let first = "";
  try {
    for (const it of items) {
      const rate = n(fd, `rate_${it.id}`); if (!(rate > 0)) throw new Error("Enter a rate for every material.");
      const o = await D.createOrder(s, me.profile.name, { kind: "sale", party_id: party.id, material_id: it.material_id, qty: n(fd, `qty_${it.id}`) || it.qty, rate, enquiry_id: e.id, terms: str(fd, "terms") });
      if (fd.get("contract") === "on") await D.draftContract(s, me.profile.name, o.id);
      first ||= o.id;
    }
  } catch (err) { return { error: msg(err) }; }
  await s.update("enquiries", e.id, { status: "won", order_id: first });
  redirect(done(`/owner/orders/${first}`));
}
export async function setEnquiryStatus(id: string, status: "quoted" | "lost" | "new") {
  const me = await mustStaff("crm", "edit"); const s = await getStore();
  await s.update("enquiries", id, { status }); await D.log(s, me.profile.name, `Marked an enquiry ${status}`);
  revalidatePath("/", "layout");
}
export async function savePartyAction(_: FormState, fd: FormData): Promise<FormState> {
  const type = str(fd, "type") === "supplier" ? "supplier" : "customer";
  const me = await mustStaff(type === "customer" ? "crm" : "purchase", "create"); const s = await getStore();
  const gstin = str(fd, "gstin").toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return { error: "That GSTIN does not look right." };
  const data = { name: str(fd, "name"), type, gstin: gstin || null, state_code: str(fd, "state_code") || stateFromGstin(gstin) || null, phone: str(fd, "phone") || null, email: str(fd, "email") || null, city: str(fd, "city") || null, address: str(fd, "address") || null, credit_days: n(fd, "credit_days") || (type === "customer" ? 15 : 30) } as const;
  if (data.name.length < 2) return { error: "Enter a name." };
  const id = str(fd, "id");
  if (id) { await s.update("parties", id, data); await D.log(s, me.profile.name, `Updated ${data.name}`); redirect(done(`/owner/parties/${id}`)); }
  const p = await D.createParty(s, me.profile.name, data);
  redirect(done(`/owner/parties/${p.id}`));
}

export async function aiDraftOffer(_: FormState, fd: FormData): Promise<FormState> {
  await mustStaff("crm", "create");
  const idea = str(fd, "idea") || "fresh stock available";
  const text = await aiWrite(`Write a WhatsApp offer about: ${idea}`, `${idea.charAt(0).toUpperCase() + idea.slice(1)}. Reply to this message with the quantity you need and we will confirm today's rate. — B2All Commo`);
  return { text, values: { idea } };
}
export async function sendOffer(fd: FormData) {
  const me = await mustStaff("crm", "create"); const s = await getStore();
  const title = str(fd, "title"), body = str(fd, "body"), channel = (str(fd, "channel") || "whatsapp") as "whatsapp" | "email" | "sms";
  const ids = fd.getAll("to").map(String);
  if (!title || !body || !ids.length) redirect("/owner/offers?error=1");
  const o = await s.insert("offers", { title, body, code: str(fd, "code") || null, valid_till: str(fd, "valid_till") || null });
  let mailed = 0;
  for (const id of ids) {
    await s.insert("offer_sends", { offer_id: o.id, party_id: id, channel, sent_at: new Date().toISOString() });
    if (channel === "email" && hasGmail) { const p = await s.one("parties", id); if (p?.email && (await sendMail(p.email, title, `<p>${body.replace(/\n/g, "<br>")}</p>${o.code ? `<p><b>Code: ${o.code}</b></p>` : ""}`))) mailed++; }
  }
  await D.log(s, me.profile.name, `Sent offer "${title}" to ${ids.length} by ${channel}${mailed ? ` (${mailed} emailed)` : ""}`);
  redirect(done(`/owner/offers?sent=${o.id}&channel=${channel}&mailed=${mailed}`));
}

/* ───────── team, roles, settings ───────── */

export async function inviteStaff(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("admin", "edit"); const s = await getStore();
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), role_id = str(fd, "role_id");
  if (name.length < 2) return { error: "Enter the person's name." };
  if (hasSupabase) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
    await s.insert("invites", { name, email, role_id });
    await D.log(s, me.profile.name, `Invited ${name} (${email})`);
    return { ok: `${name} can now open the console, choose "First time here", and set a password with ${email}.` };
  }
  await s.insert("profiles", { name, phone: "", city: "", role: "staff", staff_role_id: role_id, email: email || null });
  await D.log(s, me.profile.name, `Added ${name}`);
  revalidatePath("/owner/team");
  return { ok: `${name} added.` };
}
export async function setStaffRole(profileId: string, fd: FormData) {
  const me = await mustStaff("admin", "edit"); const s = await getStore();
  const p = await s.one("profiles", profileId); if (!p || p.role === "owner") return;
  const role_id = str(fd, "role_id");
  if (role_id === "remove") { await s.update("profiles", profileId, { role: "customer", staff_role_id: null }); await D.log(s, me.profile.name, `Removed access for ${p.name}`); }
  else { await s.update("profiles", profileId, { staff_role_id: role_id }); await D.log(s, me.profile.name, `Changed role of ${p.name}`); }
  revalidatePath("/owner/team");
}
export async function saveRole(roleId: string, fd: FormData) {
  const me = await mustStaff("admin", "edit"); const s = await getStore();
  const { MODS } = await import("@/lib/perms");
  const perms = Object.fromEntries(MODS.map((m) => [m.key, m.acts.filter((a) => fd.get(`${m.key}.${a}`) === "on")]));
  const name = str(fd, "name");
  if (roleId === "new") await s.insert("roles", { name: name || "New role", perms });
  else await s.update("roles", roleId, { perms, ...(name ? { name } : {}) });
  await D.log(s, me.profile.name, `Saved role ${name || roleId}`);
  revalidatePath("/owner/team");
}
export async function saveCompany(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("admin", "edit"); const s = await getStore();
  const gstin = str(fd, "gstin").toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return { error: "That GSTIN does not look right." };
  const patch = { name: str(fd, "name"), gstin, state_code: stateFromGstin(gstin) || str(fd, "state_code") || "22", address: str(fd, "address"), phone: str(fd, "phone"), email: str(fd, "email"), bank: str(fd, "bank"), invoice_prefix: str(fd, "invoice_prefix") || "B2A", terms: str(fd, "terms") };
  if (await s.one("company", "main")) await s.update("company", "main", patch); else await s.insert("company", { id: "main", ...patch });
  await D.log(s, me.profile.name, "Updated company settings");
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}
export async function saveMaterial(fd: FormData) {
  const me = await mustStaff("admin", "edit"); const s = await getStore();
  const id = str(fd, "id");
  const data = { name: str(fd, "name"), category: str(fd, "category") || "Other", hsn: str(fd, "hsn"), gst_rate: n(fd, "gst_rate"), unit: str(fd, "unit") || "MT", opening_qty: n(fd, "opening_qty") || 0, opening_rate: n(fd, "opening_rate") || 0, note: str(fd, "note") || null, active: fd.get("active") !== "off" };
  if (!data.name) return;
  if (id) await s.update("materials", id, data); else await s.insert("materials", data);
  await D.log(s, me.profile.name, `${id ? "Updated" : "Added"} material ${data.name}`);
  revalidatePath("/", "layout");
}
export async function guardStaff() { return isStaff(await getMe()); }
