"use client";
import { useActionState, useState } from "react";
import { convertEnquiry, type FormState } from "@/app/actions";
export default function Convert({ id, items }: { id: string; items: { id: string; qty: number; unit: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [s, act, pending] = useActionState<FormState, FormData>(convertEnquiry, {});
  if (!open) return <button className="btn btn-filled mt-3" onClick={() => setOpen(true)}>Convert to order</button>;
  return (
    <form action={act} className="card-tonal mt-4 grid gap-3 p-4">
      <input type="hidden" name="enquiry_id" value={id} />
      {items.map((i) => <div key={i.id} className="grid grid-cols-[1fr_7rem_8rem] items-end gap-2"><div className="pb-3 font-medium">{i.name}</div><label className="field"><span>Qty ({i.unit})</span><input name={`qty_${i.id}`} defaultValue={i.qty} inputMode="decimal" className="input" /></label><label className="field"><span>Rate ₹/{i.unit}</span><input name={`rate_${i.id}`} inputMode="decimal" required className="input" /></label></div>)}
      <label className="field"><span>Terms (optional)</span><input name="terms" className="input" placeholder="Delivery place, payment days…" /></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="contract" defaultChecked className="size-5 accent-[var(--pri)]" />Prepare contract for e-signing</label>
      {s.error && <p role="alert" className="text-sm font-medium text-err">{s.error}</p>}
      <div className="flex gap-2"><button className="btn btn-filled" disabled={pending}>{pending ? "Creating…" : "Create sales order"}</button><button type="button" className="btn btn-text" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
