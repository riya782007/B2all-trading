"use client";
import { useActionState, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { aiDraftOffer, sendOffer, type FormState } from "@/app/actions";
type C = { id: string; name: string; city: string; hasEmail: boolean; hasPhone: boolean };
const T = [
  ["Fresh stock", "Fresh stock available", "Fresh stock is ready for immediate dispatch. Reply with the quantity you need and we will confirm today's rate."],
  ["Bulk rate", "Better rate on larger orders", "Book 500 MT or more this month and get a special rate. Reply and we will quote for you."],
  ["Festive wishes", "Season's greetings from B2All", "Warm wishes from the B2All team. Plan your next supply with us and we will keep your plant running."],
];
export default function Composer({ customers, ai, gmail }: { customers: C[]; ai: boolean; gmail: boolean }) {
  const [title, setTitle] = useState(T[0][1]); const [body, setBody] = useState(T[0][2]);
  const [to, setTo] = useState<Set<string>>(new Set(customers.map((c) => c.id))); const [channel, setChannel] = useState("whatsapp");
  const [d, draft, drafting] = useActionState<FormState, FormData>(aiDraftOffer, {});
  useEffect(() => { if (d.text) setBody(d.text); }, [d.text]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <form action={sendOffer} className="card space-y-5 p-6">
        <div><div className="mb-2 text-sm font-medium text-ink2">1 · Message</div>
          <div className="mb-3 flex flex-wrap gap-2">{T.map(([l, t, b]) => <button type="button" key={l} className="filter" aria-current={title === t} onClick={() => { setTitle(t); setBody(b); }}>{l}</button>)}</div>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className="input font-medium" aria-label="Title" />
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} className="input mt-2 min-h-32" aria-label="Message" />
          <div className="mt-2 grid grid-cols-2 gap-2"><input name="code" placeholder="Voucher code (optional)" className="input" /><input name="valid_till" type="date" className="input" aria-label="Valid till" /></div></div>
        <div><div className="mb-2 text-sm font-medium text-ink2">2 · Who gets it · {to.size} of {customers.length}</div>
          <div className="mb-2 flex gap-2"><button type="button" className="btn btn-text btn-sm" onClick={() => setTo(new Set(customers.map((c) => c.id)))}>Everyone</button><button type="button" className="btn btn-text btn-sm" onClick={() => setTo(new Set())}>Nobody</button></div>
          <div className="max-h-60 space-y-1 overflow-auto rounded-2xl border border-line p-2">{customers.map((c) => <label key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-s2"><input type="checkbox" name="to" value={c.id} checked={to.has(c.id)} onChange={() => { const n = new Set(to); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setTo(n); }} className="size-5 accent-[var(--pri)]" /><span className="flex-1">{c.name}</span><span className="text-sm text-ink2">{c.city}</span></label>)}</div></div>
        <div><div className="mb-2 text-sm font-medium text-ink2">3 · How</div>
          <div className="grid grid-cols-3 gap-2">{[["whatsapp", "WhatsApp"], ["email", gmail ? "Email (auto)" : "Email"], ["sms", "SMS"]].map(([k, l]) => <label key={k} className={`cursor-pointer rounded-2xl border p-3 text-center text-sm font-medium ${channel === k ? "border-transparent bg-pri-c text-on-pri-c" : "border-line"}`}><input type="radio" name="channel" value={k} checked={channel === k} onChange={() => setChannel(k)} className="sr-only" />{l}</label>)}</div></div>
        <button className="btn btn-filled btn-lg w-full" disabled={!to.size || !body.trim()}>Send to {to.size} customer{to.size === 1 ? "" : "s"}</button>
      </form>
      <div className="space-y-4">
        <div className="card p-5"><div className="mb-2 text-sm font-medium text-ink2">Preview</div><div className="rounded-2xl rounded-tl-sm bg-pri-c p-4 text-sm text-on-pri-c"><div className="font-medium">{title}</div><div className="mt-1 whitespace-pre-wrap">{body}</div><div className="mt-2 opacity-70">— B2All Commo</div></div></div>
        {ai && <form action={draft} className="card-tonal space-y-2 p-5"><div className="flex items-center gap-2 font-medium"><Sparkles size={18} className="text-pri" />Write it for me</div><input name="idea" defaultValue={d.values?.idea} placeholder="e.g. 300 MT silico manganese ready this week" className="input" /><button className="btn btn-tonal w-full" disabled={drafting}>{drafting ? "Writing…" : "Draft message"}</button></form>}
      </div>
    </div>
  );
}
