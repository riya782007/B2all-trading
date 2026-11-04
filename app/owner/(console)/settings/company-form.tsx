"use client";
import { useActionState } from "react";
import { saveCompany, type FormState } from "@/app/actions";
import type { Company } from "@/lib/types";
export default function CompanyForm({ co, edit }: { co: Company; edit: boolean }) {
  const [s, act, pending] = useActionState<FormState, FormData>(saveCompany, {});

  return (
    <form action={act} className="grid gap-4 sm:grid-cols-2">
      <F co={co} edit={edit} n="name" l="Legal name" wide /><F co={co} edit={edit} n="gstin" l="GSTIN" /><F co={co} edit={edit} n="invoice_prefix" l="Invoice prefix (e.g. B2A → B2A/2026-27/0001)" />
      <F co={co} edit={edit} n="phone" l="Phone" /><F co={co} edit={edit} n="email" l="Email" /><F co={co} edit={edit} n="address" l="Address" /><F co={co} edit={edit} n="pincode" l="PIN code (used to work out truck distances)" /><F co={co} edit={edit} n="bank" l="Bank details for invoices" wide />
      <label className="field sm:col-span-2"><span>Standard terms (printed on invoices and contracts)</span><textarea name="terms" defaultValue={co.terms} className="input" disabled={!edit} /></label>
      <input type="hidden" name="state_code" value={co.state_code} />
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-2">{s.error}</p>}{s.ok && <p className="text-sm font-medium text-pri sm:col-span-2">Saved.</p>}
      {edit && <button className="btn btn-filled sm:col-span-2" disabled={pending}>{pending ? "Saving…" : "Save company details"}</button>}
    </form>
  );
}

function F({ co, edit, n, l, wide }: { co: Company; edit: boolean; n: keyof Company; l: string; wide?: boolean }) { return <label className={`field ${wide ? "sm:col-span-2" : ""}`}><span>{l}</span><input name={n} defaultValue={co[n]} className="input" disabled={!edit}/></label>; }
