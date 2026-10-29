"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { readBasket, writeBasket } from "@/components/AddToBasket";
import { submitEnquiry } from "../actions";
import type { Material } from "@/lib/types";

export default function BasketView({ materials }: { materials: Material[] }) {
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setBasket(readBasket()), []);
  const ids = Object.keys(basket).filter((id) => materials.some((m) => m.id === id));
  const set = (id: string, q: number) => { const b = { ...basket, [id]: q }; setBasket(b); writeBasket(b); };
  const remove = (id: string) => { const b = { ...basket }; delete b[id]; setBasket(b); writeBasket(b); };

  if (msg?.ok) return (
    <div className="card p-8 text-center">
      <div className="font-display text-2xl font-semibold text-brand">Enquiry sent</div>
      <p className="mt-2 text-muted">We will come back to you with a quote. You can follow it from your page.</p>
      <Link href="/account" className="btn btn-primary mt-6">Go to my page</Link>
    </div>
  );
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-brand">My enquiry</h1>
      {!ids.length ? (
        <div className="card mt-6 p-8 text-center text-muted">Nothing here yet. <Link href="/#materials" className="font-semibold text-brand2 underline">Pick materials</Link></div>
      ) : (
        <div className="mt-6 space-y-3">
          {ids.map((id) => {
            const m = materials.find((x) => x.id === id)!;
            return (
              <div key={id} className="card flex items-center justify-between gap-3 p-4">
                <div><div className="font-semibold">{m.name}</div><div className="text-sm text-muted">{m.category}</div></div>
                <div className="flex items-center gap-2">
                  <input aria-label={`Quantity of ${m.name} in metric tonnes`} type="number" min={1} inputMode="numeric" value={basket[id]} onChange={(e) => set(id, Math.max(0, Number(e.target.value)))} className="input !w-28 text-right" />
                  <span className="text-sm text-muted">MT</span>
                  <button onClick={() => remove(id)} className="px-2 text-muted" aria-label={`Remove ${m.name}`}>✕</button>
                </div>
              </div>
            );
          })}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything we should know? Grade, delivery place, timing…" className="input min-h-24" />
          {msg?.error && <p role="alert" className="text-sm text-red-600">{msg.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending || ids.some((i) => !basket[i])} onClick={() => start(async () => {
            const r = await submitEnquiry(JSON.stringify(ids.map((id) => ({ materialId: id, qty: basket[id] }))), note);
            if (r?.ok) { writeBasket({}); setBasket({}); }
            setMsg(r ?? null);
          })}>{pending ? "Sending…" : "Send enquiry"}</button>
        </div>
      )}
    </>
  );
}
