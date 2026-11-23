"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createLedgerAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";
export default function NewLedger({ open, groups }: { open: boolean; groups: string[] }) {
  const [show, setShow] = useState(open);
  const [st, act, pending] = useActionState<FormState, FormData>(createLedgerAction, {});
  const name = useRef<HTMLInputElement>(null);
  useEffect(() => { if (show) name.current?.focus(); }, [show]);
  if (!show) return <button className="btn btn-outline mb-5" onClick={() => setShow(true)}><Plus size={16} />Create ledger <kbd className="text-[10px] opacity-70">Alt+C</kbd></button>;
  return (
    <form action={act} className="card mb-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-6">
      <label className="field lg:col-span-2"><span>Ledger name</span><input ref={name} name="name" defaultValue={st.values?.name} className="input" required /></label>
      <label className="field lg:col-span-2"><span>Under (group)</span><input name="grp" list="tally-groups" defaultValue={st.values?.grp} className="input" placeholder="e.g. Indirect Expenses" required /><datalist id="tally-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist></label>
      <label className="field"><span>Opening balance</span><input name="opening" inputMode="decimal" defaultValue={st.values?.opening} className="input" placeholder="0" /></label>
      <label className="field"><span>Dr / Cr</span><select name="side" defaultValue={st.values?.side || "Dr"} className="input"><option>Dr</option><option>Cr</option></select></label>
      <label className="field lg:col-span-2"><span>GSTIN (optional)</span><input name="gstin" defaultValue={st.values?.gstin} className="input uppercase" /></label>
      <p className="text-xs text-ink2 lg:col-span-3">Customers go under Sundry Debtors and suppliers under Sundry Creditors. They are also added to your customer or supplier list.</p>
      {st.error && <p role="alert" className="text-sm font-medium text-err lg:col-span-6">{st.error}</p>}
      <div className="flex gap-2 lg:col-span-6"><button className="btn btn-filled" disabled={pending}>{pending ? "Saving…" : "Create ledger"}</button><button type="button" className="btn btn-text" onClick={() => setShow(false)}>Cancel</button></div>
    </form>
  );
}
