"use client";
import { useActionState, useState, useTransition } from "react";
import { lookupPinAction, savePartyAction, type FormState } from "@/app/actions";
import { STATES } from "@/lib/money";
import type { Party } from "@/lib/types";

export default function PartyForm({ type, p }: { type: "customer" | "supplier"; p: Party | null }) {
  const [s, act, pending] = useActionState<FormState, FormData>(savePartyAction, {});
  const [pin, setPin] = useState(p?.pincode ?? "");
  const [city, setCity] = useState(p?.city ?? "");
  const [state, setState] = useState(p?.state_code ?? "22");
  const [found, setFound] = useState<string | null>(null);
  const [looking, start] = useTransition();
  const onPin = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 6); setPin(d); setFound(null);
    if (d.length === 6) start(async () => {
      const r = await lookupPinAction(d);
      if (r) { if (r.city) setCity(r.city); if (r.state_code) setState(r.state_code); setFound(`${r.district}, ${r.state}`); }
      else setFound("PIN code not found. Fill city and state yourself.");
    });
  };
  return (
    <form action={act} className="card grid gap-4 p-6 sm:grid-cols-2">
      <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={p?.id ?? ""} />
      <label className="field sm:col-span-2"><span>Business name</span><input name="name" defaultValue={p?.name} required className="input" /></label>
      <label className="field"><span>GSTIN</span><input name="gstin" defaultValue={p?.gstin ?? ""} maxLength={15} className="input uppercase" placeholder="Optional" /></label>
      <label className="field"><span>PIN code</span><input name="pincode" value={pin} onChange={(e) => onPin(e.target.value)} inputMode="numeric" maxLength={6} className="input" placeholder="Fills city and state" />
        {(looking || found) && <span className="mt-1 !text-[.8rem] !font-normal">{looking ? "Looking up…" : found}</span>}</label>
      <label className="field"><span>City</span><input name="city" value={city} onChange={(e) => setCity(e.target.value)} className="input" /></label>
      <label className="field"><span>State</span><select name="state_code" value={state} onChange={(e) => setState(e.target.value)} className="input">{Object.entries(STATES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
      <label className="field"><span>Phone (WhatsApp)</span><input name="phone" defaultValue={p?.phone ?? ""} inputMode="tel" className="input" /></label>
      <label className="field"><span>Email</span><input name="email" type="email" defaultValue={p?.email ?? ""} className="input" /></label>
      <label className="field"><span>Credit days</span><input name="credit_days" inputMode="numeric" defaultValue={p?.credit_days ?? (type === "customer" ? 15 : 30)} className="input" /></label>
      <label className="field sm:col-span-2"><span>Address</span><textarea name="address" defaultValue={p?.address ?? ""} className="input" /></label>
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}
      <button className="btn btn-filled btn-lg sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
