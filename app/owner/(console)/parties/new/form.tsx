"use client";
import { useActionState } from "react";
import { savePartyAction, type FormState } from "@/app/actions";
import { STATES } from "@/lib/money";
import type { Party } from "@/lib/types";
export default function PartyForm({ type, p }: { type: "customer" | "supplier"; p: Party | null }) {
  const [s, act, pending] = useActionState<FormState, FormData>(savePartyAction, {});
  return (
    <form action={act} className="card grid gap-4 p-6 sm:grid-cols-2">
      <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={p?.id ?? ""} />
      <label className="field sm:col-span-2"><span>Business name</span><input name="name" defaultValue={p?.name} required className="input" /></label>
      <label className="field"><span>GSTIN</span><input name="gstin" defaultValue={p?.gstin ?? ""} maxLength={15} className="input uppercase" placeholder="Optional" /></label>
      <label className="field"><span>State (if no GSTIN)</span><select name="state_code" defaultValue={p?.state_code ?? "22"} className="input">{Object.entries(STATES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
      <label className="field"><span>Phone (WhatsApp)</span><input name="phone" defaultValue={p?.phone ?? ""} inputMode="tel" className="input" /></label>
      <label className="field"><span>Email</span><input name="email" type="email" defaultValue={p?.email ?? ""} className="input" /></label>
      <label className="field"><span>City</span><input name="city" defaultValue={p?.city ?? ""} className="input" /></label>
      <label className="field"><span>Credit days</span><input name="credit_days" inputMode="numeric" defaultValue={p?.credit_days ?? (type === "customer" ? 15 : 30)} className="input" /></label>
      <label className="field sm:col-span-2"><span>Address</span><textarea name="address" defaultValue={p?.address ?? ""} className="input" /></label>
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}
      <button className="btn btn-filled btn-lg sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
