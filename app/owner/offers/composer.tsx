"use client";
import { useState } from "react";
import { sendOffer } from "@/app/actions";

const TEMPLATES = [
  { label: "Fresh stock", title: "Fresh stock available", body: "Fresh stock is available for immediate dispatch. Reply with the quantity you need and we will confirm today's rate.", code: "" },
  { label: "Volume offer", title: "Better rate on larger orders", body: "Book 500 MT or more this month and get a special rate. Reply to this message and we will quote for you.", code: "BULK" },
  { label: "Festive wishes", title: "Season's greetings from B2All", body: "Warm wishes from the whole B2All team. Plan your next supply with us and we will keep your plant running.", code: "" },
];
type C = { id: string; name: string; city: string };

export default function Composer({ customers }: { customers: C[] }) {
  const [t, setT] = useState(TEMPLATES[0]);
  const [pick, setPick] = useState<Set<string>>(new Set(customers.map((c) => c.id)));
  const [all, setAll] = useState(true);
  const toggle = (id: string) => { const n = new Set(pick); n.has(id) ? n.delete(id) : n.add(id); setPick(n); setAll(n.size === customers.length); };
  return (
    <form action={sendOffer} className="mt-6 space-y-5">
      <div>
        <div className="mb-2 text-sm font-semibold text-muted">1. Choose a message</div>
        <div className="flex flex-wrap gap-2">{TEMPLATES.map((x) => <button type="button" key={x.label} onClick={() => setT(x)} className={`btn !min-h-11 !py-2 ${x.label === t.label ? "btn-primary" : "btn-ghost"}`}>{x.label}</button>)}</div>
        <input name="title" key={t.label + "t"} defaultValue={t.title} className="input mt-3 font-semibold" aria-label="Title" />
        <textarea name="body" key={t.label + "b"} defaultValue={t.body} className="input mt-2 min-h-28" aria-label="Message" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input name="code" key={t.label + "c"} defaultValue={t.code} placeholder="Voucher code (optional)" className="input" />
          <input name="validTill" type="date" className="input" aria-label="Valid till" />
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-muted">2. Who gets it</div>
        <label className="card flex items-center gap-3 p-3 font-semibold"><input type="checkbox" className="size-5" checked={all} onChange={(e) => { setAll(e.target.checked); setPick(new Set(e.target.checked ? customers.map((c) => c.id) : [])); }} /> All customers ({customers.length})</label>
        <div className="mt-2 max-h-56 space-y-1 overflow-auto">
          {customers.map((c) => <label key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2"><input type="checkbox" name="to" value={c.id} checked={pick.has(c.id)} onChange={() => toggle(c.id)} className="size-5" />{c.name}<span className="text-sm text-muted">{c.city}</span></label>)}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-muted">3. How</div>
        <div className="grid grid-cols-3 gap-2">
          {["whatsapp", "email", "sms"].map((c, i) => <label key={c} className="card cursor-pointer p-3 text-center font-semibold has-[:checked]:border-brand2 has-[:checked]:bg-soft"><input type="radio" name="channel" value={c} defaultChecked={i === 0} className="sr-only" />{c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : "Email"}</label>)}
        </div>
      </div>
      <button className="btn btn-primary w-full" disabled={pick.size === 0}>Send to {pick.size} customer{pick.size === 1 ? "" : "s"}</button>
    </form>
  );
}
