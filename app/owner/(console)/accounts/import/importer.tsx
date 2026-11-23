"use client";
import { useActionState } from "react";
import { tallyImportAction, tallyPreviewAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";
type R = { name: string; group: string; tallyParent: string; opening: number; gstin: string; exists: boolean };
const inr = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${n < 0 ? "Cr" : "Dr"}`;
export default function Importer() {
  const [pv, preview, loading] = useActionState<FormState, FormData>(tallyPreviewAction, {});
  const [res, save, saving] = useActionState<FormState, FormData>(tallyImportAction, {});
  const data: { ledgers: R[]; unknownGroups: string[] } | null = pv.text ? JSON.parse(pv.text) : null;
  const fresh = data?.ledgers.filter((l) => !l.exists) ?? [];
  const dr = (data?.ledgers ?? []).reduce((t, l) => t + (l.opening > 0 ? l.opening : 0), 0), cr = (data?.ledgers ?? []).reduce((t, l) => t + (l.opening < 0 ? -l.opening : 0), 0);
  return (
    <div className="space-y-4">
      <form action={preview} className="card flex flex-wrap items-center gap-3 p-5"><input type="file" name="file" accept=".xml" required className="text-sm" /><button className="btn btn-filled" disabled={loading}>{loading ? "Reading…" : "Show me what is inside"}</button>{pv.error && <p className="w-full text-sm text-err">{pv.error}</p>}</form>
      {data && <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 text-sm"><span className="mr-auto"><b>{data.ledgers.length}</b> ledgers · {fresh.length} new · openings Dr {inr(dr)} / Cr {inr(-cr)}{Math.abs(dr - cr) > 0.01 && <span className="text-err"> · difference {inr(dr - cr)} (your opening stock, if any, explains this)</span>}</span>
          <form action={save}><input type="hidden" name="rows" value={JSON.stringify(data.ledgers)} /><button className="btn btn-filled" disabled={saving || !data.ledgers.length}>{saving ? "Importing…" : "Import into B2All"}</button></form></div>
        {res.ok && <p className="bg-ok-c px-4 py-3 text-sm text-on-ok-c">{res.ok}</p>}{res.error && <p className="bg-err-c px-4 py-3 text-sm text-on-err-c">{res.error}</p>}
        {data.unknownGroups.length > 0 && <p className="px-4 py-2 text-xs text-err">Skipped ledgers under groups we could not place: {data.unknownGroups.join(", ")}. Export All Masters (so groups come too) and try again.</p>}
        <div className="max-h-[480px] overflow-auto"><table className="tbl min-w-[640px]"><thead className="sticky top-0 bg-s1"><tr><th>Ledger</th><th>Group here</th><th>Tally group</th><th className="num">Opening</th><th>Status</th></tr></thead><tbody>
          {data.ledgers.map((l, i) => <tr key={i}><td className="font-medium">{l.name}{l.gstin && <div className="text-xs text-ink2">{l.gstin}</div>}</td><td>{l.group}</td><td className="text-ink2">{l.tallyParent}</td><td className="num">{l.opening ? inr(l.opening) : "-"}</td><td className="text-xs">{l.exists ? "Already here" : "New"}</td></tr>)}
        </tbody></table></div></div>}
    </div>
  );
}
