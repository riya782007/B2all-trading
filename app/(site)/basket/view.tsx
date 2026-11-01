"use client";
import Link from "next/link";
import { Minus, Plus, Trash2, CircleCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { readBasket, writeBasket } from "@/components/site/basket";
import { submitEnquiry, type FormState } from "@/app/actions";

type M = { id: string; name: string; category: string; unit: string };
export default function BasketView({ materials }: { materials: M[] }) {
  const [b, setB] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [res, setRes] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const cur = readBasket(); const p = new URLSearchParams(location.search);
    const add = p.get("add"); if (add) { cur[add] = Number(p.get("qty")) || cur[add] || 100; writeBasket(cur); history.replaceState(null, "", "/basket"); }
    setB(cur);
  }, []);
  const ids = Object.keys(b).filter((id) => materials.some((m) => m.id === id));
  const set = (id: string, q: number) => { const n = { ...b, [id]: Math.max(0, Math.round(q)) }; setB(n); writeBasket(n); };
  const del = (id: string) => { const n = { ...b }; delete n[id]; setB(n); writeBasket(n); };
  if (res?.ok) return (
    <div className="card flex flex-col items-center p-10 text-center"><CircleCheck size={48} className="text-pri" /><h1 className="mt-4 text-3xl font-medium">Enquiry sent</h1><p className="mt-2 text-ink2">We will come back with a quote. Follow it from your page.</p><Link href="/account" className="btn btn-filled btn-lg mt-6">Go to my page</Link></div>
  );
  return (<>
    <h1 className="text-[2.4rem]">My enquiry</h1>
    {!ids.length ? <div className="card-tonal mt-6 p-10 text-center text-ink2">Nothing here yet. <Link href="/#materials" className="font-medium text-pri underline">Pick materials</Link></div> : (
      <div className="mt-6 space-y-3">
        {ids.map((id) => { const m = materials.find((x) => x.id === id)!; return (
          <div key={id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="mr-auto"><div className="display text-lg font-medium">{m.name}</div><div className="text-sm text-ink2">{m.category}</div></div>
            <div className="flex items-center gap-1 rounded-full bg-s2 p-1">
              <button className="grid size-9 place-items-center rounded-full hover:bg-s3" onClick={() => set(id, (b[id] || 0) - 50)} aria-label={`Less ${m.name}`}><Minus size={16} /></button>
              <input aria-label={`Quantity of ${m.name} in ${m.unit}`} inputMode="numeric" value={b[id] || ""} onChange={(e) => set(id, Number(e.target.value.replace(/\D/g, "")))} className="w-20 bg-transparent text-center font-medium outline-none" />
              <button className="grid size-9 place-items-center rounded-full hover:bg-s3" onClick={() => set(id, (b[id] || 0) + 50)} aria-label={`More ${m.name}`}><Plus size={16} /></button>
            </div>
            <span className="w-8 text-sm text-ink2">{m.unit}</span>
            <button onClick={() => del(id)} className="grid size-9 place-items-center rounded-full text-ink2 hover:bg-s3" aria-label={`Remove ${m.name}`}><Trash2 size={17} /></button>
          </div>); })}
        <label className="field pt-2"><span>Anything we should know?</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Grade, delivery place, timing…" className="input" /></label>
        {res?.error && <p role="alert" className="text-sm font-medium text-err">{res.error}</p>}
        <button className="btn btn-filled btn-lg w-full" disabled={pending || ids.some((i) => !b[i])} onClick={() => start(async () => { const r = await submitEnquiry(JSON.stringify(ids.map((id) => ({ material_id: id, qty: b[id] }))), note); if (r.ok) writeBasket({}); setRes(r); })}>{pending ? "Sending…" : "Send enquiry"}</button>
      </div>)}
  </>);
}
