"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasSupabase, supabaseServer } from "@/lib/supabase";
import * as store from "@/lib/store";
import type { Channel, Status } from "@/lib/types";
import { NEXT_STATUS } from "@/lib/types";

export type LoginState = { error?: string; name?: string; city?: string; phone?: string; next?: string };

function normalisePhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

/** One-step sign-in: name, mobile, city. No code for now. The browser keeps the session, so the customer
 *  returns to their own page on this device. A phone code can be added later without changing the screens. */
export async function loginAction(prev: LoginState, fd: FormData): Promise<LoginState> {
  const name = String(fd.get("name") ?? "").trim();
  const city = String(fd.get("city") ?? "").trim();
  const rawPhone = String(fd.get("phone") ?? "");
  const next = String(fd.get("next") ?? prev.next ?? "");
  const phone = normalisePhone(rawPhone);
  const keep = { name, city, phone: rawPhone, next };
  if (name.length < 2) return { ...keep, error: "Please enter your name." };
  if (!phone) return { ...keep, error: "Enter a valid 10-digit mobile number." };
  if (city.length < 2) return { ...keep, error: "Please enter your city." };

  if (hasSupabase) {
    const sb = await supabaseServer();
    let { data: { user } } = await sb.auth.getUser();
    if (!user) {
      const r = await sb.auth.signInAnonymously();
      if (r.error || !r.data.user) return { ...keep, error: "Sign-in is not available right now. Please try again shortly." };
      user = r.data.user;
    }
    const { data: existing } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const { error } = existing
      ? await sb.from("profiles").update({ phone, name, city }).eq("id", user.id)
      : await sb.from("profiles").insert({ id: user.id, phone, name, city });
    if (error) return { ...keep, error: "We could not save your details. Please try again." };
  } else {
    await store.upsertCustomer({ phone, name, city });
    (await cookies()).set("b2_demo", phone, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  redirect(next.startsWith("/") ? next : "/account");
}

export type OwnerState = { error?: string };

/** Owner sign-in: email and password (live) or one button (demo). Only accounts with role "owner" get in. */
export async function ownerLogin(_: OwnerState, fd: FormData): Promise<OwnerState> {
  if (!hasSupabase) {
    (await cookies()).set("b2_demo", "+919000000000", { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    redirect("/owner");
  }
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email: String(fd.get("email") ?? "").trim(), password: String(fd.get("password") ?? "") });
  if (error || !data.user) return { error: "Email or password is not correct." };
  const { data: p } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (p?.role !== "owner") { await sb.auth.signOut(); return { error: "This account is not an owner account." }; }
  redirect("/owner");
}

export async function logout() {
  if (hasSupabase) await (await supabaseServer()).auth.signOut();
  else (await cookies()).delete("b2_demo");
  redirect("/");
}

export async function submitEnquiry(payload: string, note: string) {
  const user = await store.getUser();
  if (!user) redirect("/login?next=/basket");
  let items: { materialId: string; qty: number }[] = [];
  try { items = JSON.parse(payload); } catch { return { error: "Something went wrong. Please try again." }; }
  try { await store.createEnquiry(user, items, note.slice(0, 500)); } catch (e: any) { return { error: e.message ?? "Could not send." }; }
  revalidatePath("/account");
  return { ok: true };
}

async function owner() {
  const u = await store.getUser();
  if (!u || u.role !== "owner") redirect("/owner/login");
  return u;
}

export async function advanceEnquiry(id: string, status: Status) {
  await owner();
  const next = NEXT_STATUS[status];
  if (next) await store.setStatus(id, next);
  revalidatePath("/owner", "layout");
}

export async function sendOffer(fd: FormData) {
  await owner();
  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  const code = String(fd.get("code") ?? "").trim();
  const validTill = String(fd.get("validTill") ?? "");
  const channel = String(fd.get("channel") ?? "whatsapp") as Channel;
  const ids = fd.getAll("to").map(String);
  if (!title || !body || !ids.length) redirect("/owner/offers?error=1");
  const offerId = await store.createOffer({ title, body, code, validTill });
  await store.recordSends(offerId, ids, channel);
  revalidatePath("/owner", "layout");
  redirect(`/owner/offers?sent=${offerId}&channel=${channel}`);
}

