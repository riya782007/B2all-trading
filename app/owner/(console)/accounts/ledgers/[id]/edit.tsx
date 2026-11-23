"use client";
import { useActionState } from "react";
import { updateLedgerAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";
export default function EditLedger({ id, grp, opening, party, groups }: { id: string; grp: string; opening: number; party: boolean; groups: string[] }) {
  const [st, act, pending] = useActionState<FormState, FormData>(updateLedgerAction, {});
  return (
    <details className="noprint card mt-6 p-5"><summary className="cursor-pointer font-medium">Alter ledger (group and opening balance)</summary>
      <form action={act} className="mt-4 grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="id" value={id} />
        <label className="field sm:col-span-2"><span>Under</span><select name="grp" defaultValue={grp} disabled={party} className="input">{groups.map((g) => <option key={g}>{g}</option>)}</select>{party && <input type="hidden" name="grp" value={grp} />}</label>
        <label className="field"><span>Opening balance</span><input name="opening" inputMode="decimal" defaultValue={Math.abs(opening) || ""} className="input" /></label>
        <label className="field"><span>Dr / Cr</span><select name="side" defaultValue={opening < 0 ? "Cr" : "Dr"} className="input"><option>Dr</option><option>Cr</option></select></label>
        {st.error && <p role="alert" className="text-sm text-err sm:col-span-4">{st.error}</p>}{st.ok && <p className="text-sm text-ok sm:col-span-4">{st.ok}</p>}
        <div className="sm:col-span-4"><button className="btn btn-filled" disabled={pending}>Save</button><span className="ml-3 text-xs text-ink2">Every change is written to the permanent edit log.</span></div>
      </form>
    </details>
  );
}
