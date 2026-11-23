import Link from "next/link";
import { Megaphone, Users, Repeat, Moon, Sparkles, MessageCircle } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { hasAI, hasGmail } from "@/lib/integrations";
import { applyFilter, personas, type Filter } from "@/lib/crm";
import { company } from "@/lib/domain";
import { sdate } from "@/lib/money";
import { Chip, Denied, Empty, Page, Section, Stat } from "@/components/ui";
import Campaign from "./campaign";

const SEGMENTS = ["all", "Due to reorder", "Active", "New", "Slipping", "Dormant", "Never ordered"];

export default async function Offers({ searchParams }: { searchParams: Promise<Filter> }) {
  if (!(await staff("crm", "create"))) return <Denied />;
  const f = await searchParams; const s = await getStore();
  const [all, mats, offers, sends, enq, co] = await Promise.all([personas(s), s.all("materials"), s.all("offers"), s.all("offer_sends"), s.all("enquiries"), company(s)]);
  const rows = applyFilter(all, f);
  const cities = [...new Set(all.map((p) => p.city).filter(Boolean))].sort();
  const states = [...new Set(all.map((p) => p.state).filter(Boolean))].sort();
  const tags = [...new Set(all.flatMap((p) => p.tags))].sort();
  const cats = [...new Set(mats.map((m) => m.category))].sort();
  const count = (seg: string) => all.filter((p) => p.segment === seg).length;
  const qs = (patch: Partial<Filter>) => `/owner/offers?${new URLSearchParams(Object.entries({ ...f, ...patch }).filter(([, v]) => v) as [string, string][]).toString()}`;
  const parties = await s.all("parties", { type: "customer" });
  const responses = (offerId: string, at: string) => { const prof = new Set(sends.filter((x) => x.offer_id === offerId).map((x) => parties.find((p) => p.id === x.party_id)?.profile_id).filter(Boolean)); return enq.filter((e) => e.created_at >= at && prof.has(e.customer_id)).length; };
  return (
    <Page title="Offers and customer targeting" sub="Find the right customers in seconds, then send a personal offer on WhatsApp or email in one go.">
      <div className="statrow mb-5">
        <Stat icon={Users} label="Customers" value={all.length} href="/owner/offers" />
        <Stat icon={Repeat} label="Due to reorder" value={count("Due to reorder")} hint="Based on how often each one buys" tone="pri" href={qs({ activity: "Due to reorder" })} />
        <Stat icon={Moon} label="Slipping or dormant" value={count("Slipping") + count("Dormant")} hint="Worth a nudge" tone="ter" href={qs({ activity: "Slipping" })} />
        <Stat icon={MessageCircle} label="Reachable on WhatsApp" value={all.filter((p) => p.whatsapp).length} hint={co.whatsapp ? `Sending from ${co.whatsapp}` : "Add your number in Settings"} />
      </div>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" action="/owner/offers">
        <input name="q" defaultValue={f.q} placeholder="Search name, city, phone, tag" className="input lg:col-span-2" aria-label="Search customers" />
        <select name="material" defaultValue={f.material ?? ""} className="input" aria-label="Has bought"><option value="">Has bought: any material</option>{mats.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <select name="category" defaultValue={f.category ?? ""} className="input" aria-label="Category"><option value="">Any category</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="activity" defaultValue={f.activity ?? "all"} className="input" aria-label="Buying pattern">{SEGMENTS.map((x) => <option key={x} value={x}>{x === "all" ? "Any buying pattern" : x}</option>)}</select>
        <select name="city" defaultValue={f.city ?? ""} className="input" aria-label="City"><option value="">Any city</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="state" defaultValue={f.state ?? ""} className="input" aria-label="State"><option value="">Any state</option>{states.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="tag" defaultValue={f.tag ?? ""} className="input" aria-label="Tag"><option value="">Any tag</option>{tags.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="minSpend" defaultValue={f.minSpend ?? ""} className="input" aria-label="Lifetime purchase"><option value="">Any purchase value</option><option value="100000">₹1 lakh +</option><option value="1000000">₹10 lakh +</option><option value="5000000">₹50 lakh +</option><option value="10000000">₹1 crore +</option></select>
        <select name="dues" defaultValue={f.dues ?? ""} className="input" aria-label="Payments"><option value="">Any payment status</option><option value="clear">Nothing due</option><option value="owes">Has dues</option><option value="overdue">Overdue</option></select>
        <select name="reach" defaultValue={f.reach ?? ""} className="input" aria-label="Reachable by"><option value="">Any contact</option><option value="whatsapp">Has WhatsApp</option><option value="email">Has email</option></select>
        <div className="flex gap-2 lg:col-span-2"><button className="btn btn-filled flex-1">Apply filters</button><Link href="/owner/offers" className="btn btn-outline">Clear</Link></div>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">{SEGMENTS.slice(1).map((x) => <Link key={x} href={qs({ activity: x })} className="filter" aria-current={f.activity === x}>{x} · {count(x)}</Link>)}</div>

      <Campaign
        customers={rows.map((p) => ({ id: p.id, name: p.name, city: p.city, state: p.state, segment: p.segment, top: p.topMaterial, lastOrder: p.lastOrder ? sdate(p.lastOrder) : "", nextDue: p.nextDue ? sdate(p.nextDue) : "", spend: p.spendAll, outstanding: p.outstanding, whatsapp: p.whatsapp, email: p.email, tags: p.tags, offersSent: p.offersSent }))}
        materials={mats.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name }))}
        audience={Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>}
        ai={hasAI} gmail={hasGmail} />

      <Section title="Campaign history">{offers.length ? <div className="card divide-y divide-line">{[...offers].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((o) => { const n = sends.filter((x) => x.offer_id === o.id).length; const r = responses(o.id, o.created_at); return (
        <Link key={o.id} href={`/owner/offers/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-s2"><div className="min-w-0 flex-1"><div className="font-medium">{o.title}</div><div className="text-sm text-ink2">{sdate(o.created_at)} · {n} customers{o.channel ? ` · ${o.channel}` : ""}{o.code ? ` · code ${o.code}` : ""}</div></div>{r > 0 && <Chip tone="green">{r} enquir{r > 1 ? "ies" : "y"} after</Chip>}<span className="text-sm font-medium text-pri">Open</span></Link>); })}</div> : <Empty icon={Megaphone} title="No offers yet">Pick customers above and write your first offer.</Empty>}</Section>
      {!hasAI && <p className="mt-3 flex items-center gap-2 text-xs text-ink2"><Sparkles size={14} />Add an OpenAI key in Vercel to get “write it for me”.</p>}
    </Page>
  );
}
