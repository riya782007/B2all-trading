"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasSupabase, supabaseServer } from "@/lib/supabase";
import * as store from "@/lib/store";
import type { Channel, Status } from "@/lib/types";
import { NEXT_STATUS } from "@/lib/types";

export type LoginState = { step: "details" | "otp"; phone?: string; name?: string; city?: string; error?: string; next?: string };

function normalisePhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export async function requestOtp(_: LoginState, fd: FormData): Promise<LoginState> {
  const name = String(fd.get("name") ?? "").trim();
  const city = String(fd.get("city") ?? "").trim();
  const phone = normalisePhone(String(fd.get("phone") ?? ""));
  const next = String(fd.get("next") ?? "");
  if (name.length < 2) return { step: "details", error: "Please enter your name.", name, city, next };
  if (!phone) return { step: "details", error: "Enter a valid 10-digit mobile number.", name, city, next };
  if (city.length < 2) return { step: "details", error: "Please enter your city.", name, city, next };
  if (hasSupabase) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithOtp({ phone });
    if (error) return { step: "details", error: "Could not send the code. Please try again.", name, city, next };
  }
  return { step: "otp", phone, name, city, next };
}

export async function verifyOtp(prev: LoginState, fd: FormData): Promise<LoginState> {
  const code = String(fd.get("code") ?? "").trim();
  const { phone, name = "", city = "", next = "" } = prev;
  if (!phone) return { step: "details" };
  let role: "customer" | "owner" = "customer";
  if (hasSupabase) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.verifyOtp({ phone, token: code, type: "sms" });
    if (error || !data.user) return { ...prev, error: "That code is not correct." };
    // Use this same client: it holds the new session, while a fresh client would still be anonymous.
    const { data: existing } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    const { error: pe } = existing
      ? await sb.from("profiles").update({ phone, name, city }).eq("id", data.user.id)
      : await sb.from("profiles").insert({ id: data.user.id, phone, name, city });
    if (pe) return { ...prev, error: "Signed in, but we could not save your details. Please try again." };
    role = existing?.role === "owner" ? "owner" : "customer";
  } else {
    if (code !== "123456") return { ...prev, error: "Demo code is 123456." };
    const u = await store.upsertCustomer({ phone, name, city });
    role = u?.role ?? "customer";
    (await cookies()).set("b2_demo", phone, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  redirect(role === "owner" ? "/owner" : next.startsWith("/") ? next : "/account");
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
  if (!u || u.role !== "owner") redirect("/login?next=/owner");
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

export async function loginAction(prev: LoginState, fd: FormData): Promise<LoginState> {
  return prev.step === "otp" ? verifyOtp(prev, fd) : requestOtp(prev, fd);
}
