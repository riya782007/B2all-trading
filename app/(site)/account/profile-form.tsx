"use client";
import { useActionState } from "react";
import { updateMyProfile, type FormState } from "@/app/actions";
import type { Profile } from "@/lib/types";
export default function ProfileForm({ p }: { p: Profile }) {
  const [s, act, pending] = useActionState<FormState, FormData>(updateMyProfile, {});
  return (
    <form action={act} className="grid gap-4 sm:grid-cols-2">
      <label className="field"><span>Name</span><input name="name" defaultValue={p.name} required className="input" /></label>
      <label className="field"><span>Company</span><input name="company" defaultValue={p.company ?? ""} className="input" /></label>
      <label className="field"><span>City</span><input name="city" defaultValue={p.city} className="input" /></label>
      <label className="field"><span>Email (for invoices)</span><input name="email" type="email" defaultValue={p.email ?? ""} className="input" /></label>
      <label className="field sm:col-span-2"><span>GSTIN (for tax invoices)</span><input name="gstin" defaultValue={p.gstin ?? ""} className="input uppercase" maxLength={15} /></label>
      <label className="field sm:col-span-2"><span>Billing address</span><textarea name="address" defaultValue={p.address ?? ""} className="input" /></label>
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}
      {s.ok && <p role="status" className="text-sm font-medium text-pri sm:col-span-2">Saved.</p>}
      <button className="btn btn-filled sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
