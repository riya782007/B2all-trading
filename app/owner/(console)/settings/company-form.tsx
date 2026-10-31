"use client";
import { useActionState } from "react";
import { saveCompany, type FormState } from "@/app/actions";
import type { Company } from "@/lib/types";
export default function CompanyForm({ co, edit }: { co: Company; edit: boolean }) {
  const [s, act, pending] = useActionState<FormState, FormData>(saveCompany, {});
  const F = ({ n, l, v, wide }: { n: keyof Company; l: string; v?: string; wide?: boolean }) => <label className={`field ${wide ? "sm:col-span-2" : ""}`}><span>{l}</span><input name={n} defaultValue={v ?? (co[n] as string)} className="input" disabled={!edit} /></label>;
  return (
    <form action={act} className="grid gap-4 sm:grid-cols-2">
      <F n="name" l="Legal name" wide /><F n="gstin" l="GSTIN" /><F n="invoice_prefix" l="Invoice prefix (e.g. B2A → B2A/2026-27/0001)" />
      <F n="phone" l="Phone" /><F n="email" l="Email" /><F n="address" l="Address" wide /><F n="bank" l="Bank details for invoices" wide />
      <label className="field sm:col-span-2"><span>Standard terms (printed on invoices and contracts)</span><textarea name="terms" defaultValue={co.terms} className="input" disabled={!edit} /></label>
      <input type="hidden" name="state_code" value={co.state_code} />
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}{s.ok && <p className="text-sm font-medium text-pri sm:col-span-2">Saved.</p>}
      {edit && <button className="btn btn-filled sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Save company details"}</button>}
    </form>
  );
}
