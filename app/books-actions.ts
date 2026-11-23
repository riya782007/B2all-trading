"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { mustStaff } from "@/lib/auth";
import * as D from "@/lib/domain";
import * as B from "@/lib/books";
import { hasGmail, sendMail } from "@/lib/integrations";
import { personalise } from "@/lib/links";
import { today, validDate } from "@/lib/money";
import type { Entry, VType } from "@/lib/types";
import type { FormState } from "@/app/actions";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(str(fd, k).replace(/,/g, ""));
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");
const html = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const done = (path: string) => { revalidatePath("/", "layout"); return path; };

/* ───────────── Tally-style voucher entry (F4 contra, F5 payment, F6 receipt, F7 journal) ───────────── */
export async function postVoucherAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "create"); const s = await getStore();
  const type = str(fd, "type") as VType;
  if (!["contra", "payment", "receipt", "journal"].includes(type)) return { error: "Choose a voucher type." };
  let lines: { ledger_id: string; side: "Dr" | "Cr"; amount: number }[] = [];
  try { lines = JSON.parse(str(fd, "lines") || "[]"); } catch { return { error: "Could not read the entries. Please try again." }; }
  lines = lines.filter((l) => l.ledger_id && Number(l.amount) > 0);
  if (lines.length < 2) return { error: "A voucher needs at least one debit and one credit line." };
  const ls = await s.all("ledgers"); const L = new Map(ls.map((l) => [l.id, l]));
  if (lines.some((l) => !L.has(l.ledger_id))) return { error: "One of the ledgers no longer exists." };
  const cb = (l: (typeof lines)[number]) => B.isCashBank(L.get(l.ledger_id));
  const dr = lines.filter((l) => l.side === "Dr"), cr = lines.filter((l) => l.side === "Cr");
  // Tally's rules for each voucher type
  if (type === "contra" && !lines.every(cb)) return { error: "Contra (F4) is only for moving money between cash and bank accounts." };
  if (type === "payment" && !cr.some(cb)) return { error: "In a payment (F5) the credit side must be a cash or bank account." };
  if (type === "receipt" && !dr.some(cb)) return { error: "In a receipt (F6) the debit side must be a cash or bank account." };
  if (type === "journal" && lines.some(cb)) return { error: "Journal (F7) does not use cash or bank. Use payment, receipt or contra instead." };
  const entries: Entry[] = lines.map((l) => ({ ledger_id: l.ledger_id, dr: l.side === "Dr" ? Number(l.amount) : 0, cr: l.side === "Cr" ? Number(l.amount) : 0 }));
  const partyLedger = lines.map((l) => L.get(l.ledger_id)).find((l) => l?.party_id);
  const invoice_id = str(fd, "invoice_id") || undefined;
  if (invoice_id && !partyLedger) return { error: "Pick the party's ledger to settle a bill against it." };
  const date = str(fd, "date") || today();
  let id: string;
  try {
    id = (await D.postVoucher(s, me.profile.name, { type, date, party_id: partyLedger?.party_id ?? null, invoice_id: (type === "receipt" || type === "payment") ? invoice_id : undefined, narration: str(fd, "narration").slice(0, 500), entries, request_id: str(fd, "request_id") || undefined })).id;
  } catch (e) { return { error: msg(e) }; }
  redirect(done(`/owner/accounts/v/${id}?saved=1`));
}

export async function postNoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "create"); const s = await getStore();
  const kind = str(fd, "kind") === "debit_note" ? "debit_note" : "credit_note";
  let id: string;
  try {
    id = (await B.postNote(s, me.profile.name, { kind, party_id: str(fd, "party_id"), invoice_id: str(fd, "invoice_id") || undefined, date: str(fd, "date") || today(), taxable: n(fd, "taxable"), gst_rate: n(fd, "gst_rate"), reason: str(fd, "reason") || "Adjustment", narration: str(fd, "narration"), request_id: str(fd, "request_id") || undefined })).id;
  } catch (e) { return { error: msg(e) }; }
  redirect(done(`/owner/accounts/v/${id}?saved=1`));
}

export async function reverseVoucherAction(fd: FormData) {
  const me = await mustStaff("accounts", "create"); const s = await getStore();
  let id: string;
  try { id = (await B.reverseVoucher(s, me.profile.name, str(fd, "id"), str(fd, "date") || today())).id; }
  catch (e) { redirect(`/owner/accounts/v/${str(fd, "id")}?error=${encodeURIComponent(msg(e))}`); }
  redirect(done(`/owner/accounts/v/${id}?saved=1`));
}

/* ───────────── Ledger masters (Alt+C) ───────────── */
export async function createLedgerAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "create"); const s = await getStore();
  const name = str(fd, "name"), grp = B.groupOf(str(fd, "grp"))?.name;
  const values = Object.fromEntries(["name", "grp", "opening", "side", "gstin"].map((k) => [k, str(fd, k)]));
  if (name.length < 2) return { error: "Enter the ledger name.", values };
  if (!grp) return { error: "Choose one of Tally's groups.", values };
  if ((await s.all("ledgers")).some((l) => l.name.toLowerCase() === name.toLowerCase())) return { error: "A ledger with this name already exists.", values };
  const amt = n(fd, "opening") || 0; if (!Number.isFinite(amt) || amt < 0) return { error: "Enter the opening balance as a positive number and pick Dr or Cr.", values };
  const opening = str(fd, "side") === "Cr" ? -amt : amt;
  const gstin = str(fd, "gstin").toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return { error: "That GSTIN does not look right.", values };
  let id: string;
  if (grp === "Sundry Debtors" || grp === "Sundry Creditors") {
    const p = await D.createParty(s, me.profile.name, { name, type: grp === "Sundry Debtors" ? "customer" : "supplier", gstin: gstin || null });
    const l = await D.partyLedger(s, p); if (opening) await s.update("ledgers", l.id, { opening }); id = l.id;
  } else { id = (await s.insert("ledgers", { name, grp, opening, ...(gstin ? { gstin } : {}) })).id; await D.log(s, me.profile.name, `Created ledger ${name} under ${grp}`); }
  const back = str(fd, "back");
  if (back.startsWith("/owner/")) redirect(done(back));
  redirect(done(`/owner/accounts/ledgers/${id}?saved=1`));
}
export async function updateLedgerAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "edit"); const s = await getStore();
  const l = await s.one("ledgers", str(fd, "id")); if (!l) return { error: "Ledger not found." };
  const grp = B.groupOf(str(fd, "grp"))?.name; if (!grp) return { error: "Choose one of Tally's groups." };
  if (l.party_id && grp !== l.grp) return { error: "A customer or supplier ledger stays under Sundry Debtors or Sundry Creditors." };
  const amt = n(fd, "opening") || 0; if (!Number.isFinite(amt) || amt < 0) return { error: "Enter the opening balance as a positive number and pick Dr or Cr." };
  const opening = str(fd, "side") === "Cr" ? -amt : amt;
  const lock = (await D.company(s)).books_locked_till;
  if (lock && opening !== Number(l.opening)) return { error: `Books are locked up to ${lock}. Opening balances cannot change while the books are locked.` };
  await s.update("ledgers", l.id, { grp, opening });
  await D.log(s, me.profile.name, `Updated ledger ${l.name}`);
  revalidatePath("/", "layout"); return { ok: "Saved. The change is recorded in the edit log." };
}

/* ───────────── Bank reconciliation ───────────── */
export async function bankDateAction(fd: FormData) {
  const me = await mustStaff("accounts", "create"); const s = await getStore();
  await B.setBankDate(s, me.profile.name, str(fd, "voucher_id"), str(fd, "ledger_id"), str(fd, "bank_date") || null);
  revalidatePath("/owner/accounts/bank");
}
export async function bankMatchesAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "create"); const s = await getStore();
  let rows: { voucher_id: string; bank_date: string; ref?: string }[] = [];
  try { rows = JSON.parse(str(fd, "matches") || "[]"); } catch { return { error: "Could not read the matches." }; }
  const ledger = str(fd, "ledger_id");
  try { for (const r of rows) await B.setBankDate(s, me.profile.name, r.voucher_id, ledger, r.bank_date, r.ref); } catch (e) { return { error: msg(e) }; }
  await D.log(s, me.profile.name, `Reconciled ${rows.length} bank entries from a statement`);
  revalidatePath("/owner/accounts/bank"); return { ok: `${rows.length} entries marked as cleared in the bank.` };
}

/* ───────────── Books lock (owner) ───────────── */
export async function lockBooksAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("admin", "edit"); const s = await getStore();
  if (me.profile.role !== "owner") return { error: "Only the owner can lock or unlock the books." };
  const d = str(fd, "books_locked_till");
  if (d && !validDate(d)) return { error: "Enter a valid date." };
  await s.update("company", "main", { books_locked_till: d || null });
  await D.log(s, me.profile.name, d ? `Locked books up to ${d}` : "Unlocked the books");
  revalidatePath("/", "layout"); return { ok: d ? `Books locked up to ${d}. Nobody can post or change entries on or before this date.` : "Books unlocked." };
}

/* ───────────── Import from Tally ───────────── */
export async function tallyPreviewAction(_: FormState, fd: FormData): Promise<FormState> {
  await mustStaff("accounts", "edit"); const s = await getStore();
  const f = fd.get("file"); if (!(f instanceof File) || !f.size) return { error: "Choose the XML file you exported from Tally." };
  if (f.size > 15_000_000) return { error: "That file is too large. Export only ledger masters from Tally." };
  let text = ""; const buf = new Uint8Array(await f.arrayBuffer());
  text = buf[0] === 0xff && buf[1] === 0xfe ? new TextDecoder("utf-16le").decode(buf) : new TextDecoder().decode(buf);
  if (!/<ENVELOPE/i.test(text) || !/<LEDGER/i.test(text)) return { error: "This does not look like a Tally XML export with ledgers. In Tally: Gateway → Export → Masters → choose XML." };
  try {
    const r = B.parseTallyMasters(text, (await s.all("ledgers")).map((l) => l.name));
    return { text: JSON.stringify(r), ok: `${r.ledgers.length} ledgers found.` };
  } catch (e) { return { error: msg(e) }; }
}
export async function tallyImportAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("accounts", "edit"); const s = await getStore();
  let rows: B.TallyLedger[] = [];
  try { rows = JSON.parse(str(fd, "rows") || "[]"); } catch { return { error: "Could not read the preview. Upload the file again." }; }
  if (!rows.length) return { error: "Nothing to import." };
  const clean = rows.filter((r) => typeof r.name === "string" && r.name.length && B.groupOf(r.group) && Number.isFinite(Number(r.opening))).map((r) => ({ ...r, group: B.groupOf(r.group)!.name, opening: Number(r.opening) }));
  try {
    const r = await B.importTallyLedgers(s, me.profile.name, clean);
    await D.log(s, me.profile.name, `Imported ${r.created} ledgers from Tally (${r.updated} openings filled, ${r.skipped.length} skipped)`);
    revalidatePath("/", "layout");
    return { ok: `Imported ${r.created} ledgers and filled ${r.updated} opening balances.${r.skipped.length ? ` Skipped ${r.skipped.length} that already had balances here: ${r.skipped.slice(0, 8).join(", ")}${r.skipped.length > 8 ? "…" : ""}.` : ""}` };
  } catch (e) { return { error: msg(e) }; }
}

/* ───────────── Customer targeting and offer campaigns ───────────── */
export async function createCampaign(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("crm", "create"); const s = await getStore();
  const title = str(fd, "title"), body = str(fd, "body"), channel = (["whatsapp", "email", "sms", "website"].includes(str(fd, "channel")) ? str(fd, "channel") : "whatsapp") as "whatsapp" | "email" | "sms" | "website";
  const ids = [...new Set(fd.getAll("to").map(String))];
  if (!title || !body) return { error: "Write a title and a message." };
  if (!ids.length && channel !== "website") return { error: "Pick at least one customer." };
  if (ids.length > 2000) return { error: "Send to at most 2,000 customers at a time." };
  const valid = str(fd, "valid_till"); if (valid && !validDate(valid)) return { error: "Enter a valid date for 'valid till'." };
  const parties = await s.all("parties", { type: "customer" });
  const to = channel === "website" ? [] : parties.filter((p) => ids.includes(p.id));
  let audience: Record<string, string> | null = null; try { audience = JSON.parse(str(fd, "audience") || "null"); } catch { audience = null; }
  const extra = { ...(str(fd, "discount") ? { discount: str(fd, "discount") } : {}), ...(str(fd, "material_id") ? { material_id: str(fd, "material_id") } : {}), ...(audience ? { audience } : {}), channel };
  let o;
  try { o = await s.insert("offers", { title, body, code: str(fd, "code") || null, valid_till: valid || null, ...extra }); }
  catch (e) { if (channel === "website") return { error: "Install database update 006 to publish offers on the website." }; void e; o = await s.insert("offers", { title, body, code: str(fd, "code") || null, valid_till: valid || null }); } // before the 006 update is installed
  const mats = await s.all("materials"); const mat = mats.find((m) => m.id === str(fd, "material_id"));
  let mailed = 0;
  for (const p of to) {
    await s.insert("offer_sends", { offer_id: o.id, party_id: p.id, channel: channel as "whatsapp" | "email" | "sms", sent_at: new Date().toISOString() });
    if (channel === "email" && hasGmail && p.email) {
      const v = { name: p.name, company: p.name, city: p.city ?? "", material: mat?.name ?? "" };
      if (await sendMail(p.email, personalise(title, v), `<p>${html(personalise(body, v)).replace(/\n/g, "<br>")}</p>${o.code ? `<p><b>Code: ${html(o.code)}</b></p>` : ""}${o.valid_till ? `<p>Valid till ${html(o.valid_till)}</p>` : ""}`)) mailed++;
    }
  }
  await D.log(s, me.profile.name, channel === "website" ? `Published offer "${title}" on the website` : `Prepared offer "${title}" for ${to.length} customers by ${channel}${mailed ? ` (${mailed} emailed)` : ""}`);
  redirect(done(`/owner/offers/${o.id}?new=1&mailed=${mailed}`));
}
export async function savePersonaAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await mustStaff("crm", "edit"); const s = await getStore();
  const p = await s.one("parties", str(fd, "id")); if (!p) return { error: "Customer not found." };
  const tags = [...new Set(str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean).map((t) => t.slice(0, 40)))].slice(0, 20);
  try { await s.update("parties", p.id, { tags, notes: str(fd, "notes").slice(0, 2000) || null, whatsapp: str(fd, "whatsapp") || null }); }
  catch { return { error: "Install the latest database update (006) to save tags and notes." }; }
  await D.log(s, me.profile.name, `Updated notes and tags for ${p.name}`);
  revalidatePath(`/owner/parties/${p.id}`); return { ok: "Saved." };
}
