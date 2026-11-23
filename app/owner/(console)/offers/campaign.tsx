"use client";
import { useActionState, useMemo, useState } from "react";
import { Sparkles, MessageCircle, Mail, Smartphone } from "lucide-react";
import { aiDraftOffer, type FormState } from "@/app/actions";
import { createCampaign } from "@/app/books-actions";

type C = { id: string; name: string; city: string; state: string; segment: string; top: string; lastOrder: string; nextDue: string; spend: number; outstanding: number; whatsapp: string; email: string; tags: string[]; offersSent: number };
const T: [string, string, string][] = [
  ["Reorder reminder", "Time to restock {material}?", "Hello {name}, based on your last orders you may need {material} soon. We have fresh stock ready to dispatch. Reply with the quantity and we will confirm today's rate."],
  ["Fresh stock", "Fresh stock available", "Hello {name}, fresh stock is ready for immediate dispatch. Reply with the quantity you need and we will confirm today's rate."],
  ["Price drop", "Better rate this week", "Hello {name}, we have a better rate on {material} this week for {city}. Reply and we will quote for you today."],
  ["Bulk discount", "Special rate on larger orders", "Hello {name}, book 500 MT or more this month and get a special rate. Reply and we will quote for you."],
  ["We miss you", "It has been a while", "Hello {name}, it has been a while since your last order. Tell us what you need this month and we will make it worth your while."],
  ["Festive wishes", "Season's greetings from B2All", "Warm wishes from the B2All team, {name}. Plan your next supply with us and we will keep your plant running."],
];
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fill = (t: string, c: C, mat: string) => t.replace(/\{name\}/g, c.name).replace(/\{company\}/g, c.name).replace(/\{city\}/g, c.city || "your city").replace(/\{material\}/g, mat || c.top || "your material");

export default function Campaign({ customers, materials, audience, ai, gmail }: { customers: C[]; materials: { id: string; name: string }[]; audience: Record<string, string>; ai: boolean; gmail: boolean }) {
  const [title, setTitle] = useState(T[0][1]); const [body, setBody] = useState(T[0][2]);
  const [to, setTo] = useState<Set<string>>(new Set(customers.map((c) => c.id)));
  const [channel, setChannel] = useState("whatsapp"); const [mat, setMat] = useState("");
  const [st, act, pending] = useActionState<FormState, FormData>(createCampaign, {});
  const [d, draft, drafting] = useActionState<FormState, FormData>(async (prev, fd) => { const r = await aiDraftOffer(prev, fd); if (r.text) setBody(r.text); return r; }, {});
  const chosen = customers.filter((c) => to.has(c.id));
  const reachable = chosen.filter((c) => (channel === "email" ? c.email : c.whatsapp)).length;
  const matName = materials.find((m) => m.id === mat)?.name ?? "";
  const sample = chosen[0] ?? customers[0];
  const preview = useMemo(() => sample ? { t: fill(title, sample, matName), b: fill(body, sample, matName) } : { t: title, b: body }, [title, body, sample, matName]);
  const toggle = (id: string) => { const n = new Set(to); if (n.has(id)) n.delete(id); else n.add(id); setTo(n); };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_24rem]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-sm"><span className="font-medium">{customers.length} customers match · {to.size} selected</span>
          <span className="flex gap-1"><button type="button" className="btn btn-text btn-sm" onClick={() => setTo(new Set(customers.map((c) => c.id)))}>Select all</button><button type="button" className="btn btn-text btn-sm" onClick={() => setTo(new Set())}>Clear</button></span></div>
        {!customers.length ? <p className="p-6 text-sm text-ink2">No customers match these filters. Loosen a filter or clear them.</p> :
        <div className="max-h-[560px] overflow-auto"><table className="tbl min-w-[760px]"><thead className="sticky top-0 z-10 bg-s1"><tr><th className="w-10"></th><th>Customer</th><th>Pattern</th><th>Buys most</th><th>Last order</th><th className="num">Lifetime</th><th>Reach</th></tr></thead><tbody>
          {customers.map((c) => <tr key={c.id} className={to.has(c.id) ? "" : "opacity-60"}>
            <td><input type="checkbox" aria-label={`Include ${c.name}`} checked={to.has(c.id)} onChange={() => toggle(c.id)} className="size-5 accent-[var(--pri)]" /></td>
            <td><div className="font-medium">{c.name}</div><div className="text-xs text-ink2">{[c.city, c.state].filter(Boolean).join(", ")}{c.tags.length ? ` · ${c.tags.join(", ")}` : ""}</div></td>
            <td><span className={`chip ${c.segment === "Due to reorder" ? "chip-green" : c.segment === "Slipping" || c.segment === "Dormant" ? "chip-amber" : "chip-grey"}`}>{c.segment}</span>{c.nextDue && <div className="mt-1 text-xs text-ink2">next ~{c.nextDue}</div>}</td>
            <td className="text-sm">{c.top || "-"}</td><td className="text-sm">{c.lastOrder || "-"}</td>
            <td className="num text-sm">{inr(c.spend)}{c.outstanding > 0 && <div className="text-xs text-err">{inr(c.outstanding)} due</div>}</td>
            <td className="text-xs">{c.whatsapp ? <MessageCircle size={15} className="inline text-ok" aria-label="WhatsApp" /> : null} {c.email ? <Mail size={15} className="inline text-ink2" aria-label="Email" /> : null}{c.offersSent ? <div className="text-ink2">{c.offersSent} offers before</div> : null}</td>
          </tr>)}
        </tbody></table></div>}
      </div>

      <form action={act} className="card space-y-4 p-5 xl:sticky xl:top-24">
        {[...to].map((id) => <input key={id} type="hidden" name="to" value={id} />)}
        <input type="hidden" name="audience" value={JSON.stringify(audience)} />
        <div><div className="mb-2 text-sm font-medium text-ink2">1 · Message</div>
          <div className="mb-3 flex flex-wrap gap-1.5">{T.map(([l, t, b]) => <button type="button" key={l} className="filter" aria-current={title === t} onClick={() => { setTitle(t); setBody(b); }}>{l}</button>)}</div>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className="input font-medium" aria-label="Title" />
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} className="input mt-2 min-h-32" aria-label="Message" />
          <p className="mt-1 text-xs text-ink2">{"{name}"}, {"{material}"} and {"{city}"} are filled in for each customer.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select name="material_id" value={mat} onChange={(e) => setMat(e.target.value)} className="input col-span-2" aria-label="Material on offer"><option value="">Material: each customer&apos;s usual one</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <input name="discount" placeholder="Discount (e.g. ₹150/MT off)" className="input" aria-label="Discount" /><input name="code" placeholder="Offer code" className="input" aria-label="Offer code" />
            <label className="col-span-2 text-xs text-ink2">Valid till<input name="valid_till" type="date" className="input mt-1" /></label>
          </div></div>
        <div><div className="mb-2 text-sm font-medium text-ink2">2 · Send by</div>
          <div className="grid grid-cols-3 gap-2">{([["whatsapp", "WhatsApp", MessageCircle], ["email", gmail ? "Email (auto)" : "Email", Mail], ["sms", "SMS", Smartphone]] as const).map(([k, l, Icon]) => <label key={k} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium ${channel === k ? "border-ink bg-ink text-s1" : "border-line"}`}><input type="radio" name="channel" value={k} checked={channel === k} onChange={() => setChannel(k)} className="sr-only" /><Icon size={18} />{l}</label>)}</div>
          <p className="mt-2 text-xs text-ink2">{reachable} of {to.size} selected have {channel === "email" ? "an email" : "a mobile number"}.{channel === "whatsapp" && " Next you get a send queue: each tap opens WhatsApp with the personal message typed in."}</p></div>
        <div className="rounded-xl rounded-tl-sm bg-pri-c p-4 text-sm text-on-pri-c"><div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">Preview{sample ? ` for ${sample.name}` : ""}</div><div className="font-medium">{preview.t}</div><div className="mt-1 whitespace-pre-wrap">{preview.b}</div><div className="mt-2 opacity-70">— B2All Commo</div></div>
        {st.error && <p role="alert" className="text-sm font-medium text-err">{st.error}</p>}
        <button className="btn btn-filled btn-lg w-full" disabled={!to.size || !body.trim() || pending}>{pending ? "Preparing…" : `Prepare for ${to.size} customer${to.size === 1 ? "" : "s"}`}</button>
      </form>
      {ai && <form action={draft} className="card-tonal space-y-2 p-5 xl:col-start-2"><div className="flex items-center gap-2 font-medium"><Sparkles size={18} className="text-pri" />Write it for me</div><input name="idea" defaultValue={d.values?.idea} placeholder="e.g. 300 MT silico manganese ready this week" className="input" /><button className="btn btn-tonal w-full" disabled={drafting}>{drafting ? "Writing…" : "Draft message"}</button></form>}
    </div>
  );
}
