import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSignature, Sparkles, TrendingUp, Repeat, Package, Truck, FileText } from "lucide-react";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { insights } from "@/lib/domain";
import { fdate, inr, num, sdate } from "@/lib/money";
import { Bar, Chip, Empty } from "@/components/ui";
import ProfileForm from "./profile-form";
import { signOut } from "@/app/actions";

export const metadata = { title: "My account" };
const TABS = [["overview", "Overview"], ["orders", "Orders"], ["documents", "Documents"], ["profile", "Profile"]] as const;

export default async function Account({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getMe();
  if (!me || me.profile.role !== "customer") redirect("/login?next=/account");
  const { tab = "overview" } = await searchParams;
  const s = await getStore();
  const party = (await s.all("parties", { profile_id: me.profile.id }))[0];
  const ins = party ? await insights(s, party.id) : null;
  const [enqs, items, mats, contracts] = await Promise.all([s.all("enquiries", { customer_id: me.profile.id }), s.all("enquiry_items"), s.all("materials"), party ? s.all("contracts", { party_id: party.id }) : Promise.resolve([])]);
  const toSign = contracts.filter((c) => c.status === "sent");
  const openEnq = enqs.filter((e) => e.status === "new" || e.status === "quoted").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const first = me.profile.name.split(" ")[0];
  const maxM = Math.max(1, ...(ins?.monthly.map((m) => m.qty) ?? [1]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[2.6rem]">Hi, {first}</h1><p className="mt-1 text-ink2">{[me.profile.company, me.profile.city].filter(Boolean).join(", ")}</p></div>
        <Link href="/#materials" className="btn btn-filled">New enquiry</Link>
      </div>
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Account sections">
        {TABS.map(([k, l]) => <Link key={k} href={`/account?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`-mb-px border-b-[3px] px-4 pb-3 pt-2 text-sm font-semibold ${tab === k ? "border-act text-ink" : "border-transparent text-ink2 hover:text-ink"}`}>{l}{k === "documents" && toSign.length ? <span className="chip chip-amber ml-2 !h-5 !px-2">{toSign.length}</span> : null}</Link>)}
      </nav>

      {toSign.length > 0 && tab !== "documents" && (
        <Link href={`/account/contracts/${toSign[0].id}`} className="mt-6 flex items-center gap-4 rounded-[14px] bg-rail p-5 text-white"><FileSignature size={26} /><div className="flex-1"><div className="font-medium">Contract {toSign[0].number} is waiting for your signature</div><div className="text-sm text-rail-ink">Review and sign in under a minute.</div></div><span className="btn btn-filled">Review</span></Link>
      )}

      {tab === "overview" && (<div className="mt-6 space-y-6">
        {!ins || !ins.orders.length ? <Empty icon={Sparkles} title="Your buying story starts here">Once you place orders, you'll see what you buy most, how often, and when you're likely to need more.</Empty> : (<>
          <div className="statrow">
            <Card icon={TrendingUp} label="Bought this year" value={inr(ins.spendFY)} hint={`${ins.orders.length} orders`} />
            <Card icon={Package} label="Your top material" value={ins.top?.m.name ?? "-"} hint={ins.top ? `${num(ins.top.qty)} ${ins.top.m.unit} so far` : ""} />
            <Card icon={Repeat} label="You usually order" value={ins.avgGap ? `every ${ins.avgGap} days` : "-"} hint={ins.nextExpected ? `Next likely around ${sdate(ins.nextExpected)}` : "Order again to see your rhythm"} />
            <Card icon={Truck} label="Typical order" value={`${num(ins.avgOrder)} ${ins.top?.m.unit ?? "MT"}`} hint={ins.outstanding > 0 ? `${inr(ins.outstanding)} to pay` : "Nothing due"} />
          </div>
          {ins.top && ins.nextExpected && (
            <div className="flex flex-wrap items-center gap-4 rounded-[14px] bg-act/25 p-5 ring-1 ring-act"><Repeat size={24} /><div className="flex-1"><div className="font-medium">Time to restock {ins.top.m.name}?</div><div className="text-sm opacity-80">Based on your last orders, you usually need about {num(ins.avgOrder)} {ins.top.m.unit} around {sdate(ins.nextExpected)}.</div></div><Link href={`/basket?add=${ins.top.m.id}&qty=${Math.round(ins.avgOrder)}`} className="btn btn-filled">Reorder</Link></div>)}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card p-5"><h2 className="text-[1.15rem]">What you buy</h2><div className="mt-4 space-y-3">{ins.byMat.map((x) => <div key={x.m.id}><div className="mb-1 flex justify-between text-sm"><span>{x.m.name}</span><span className="text-ink2">{num(x.qty)} {x.m.unit} · {Math.round((x.qty / ins.totalQty) * 100)}%</span></div><Bar pct={(x.qty / ins.totalQty) * 100} /></div>)}</div></div>
            <div className="card p-5"><h2 className="text-[1.15rem]">Last six months</h2><div className="mt-5 flex h-40 items-end gap-3" role="img" aria-label="Quantity ordered per month">{ins.monthly.map((m) => <div key={m.mo} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-[4px] bg-ink/85" style={{ height: `${(m.qty / maxM) * 85}%`, minHeight: m.qty ? 6 : 2 }} title={`${num(m.qty)}`} /><span className="text-xs text-ink2">{new Date(m.mo + "-01").toLocaleDateString("en-IN", { month: "short" })}</span></div>)}</div></div>
          </div>
        </>)}
        {ins && ins.recs.length > 0 && (<section><h2 className="mb-3 text-lg font-medium">You may also need</h2><div className="grid gap-3 sm:grid-cols-3">{ins.recs.map((m) => <Link key={m.id} href={`/basket?add=${m.id}`} className="card p-5 hover:shadow-[var(--shadow)]"><div className="display font-medium">{m.name}</div><div className="text-sm text-ink2">{m.category}</div><div className="mt-3 text-sm font-semibold text-pri">Add to enquiry</div></Link>)}</div></section>)}
        {openEnq.length > 0 && (<section><h2 className="mb-3 text-lg font-medium">Open enquiries</h2><div className="space-y-2">{openEnq.map((e) => <div key={e.id} className="card flex flex-wrap items-center justify-between gap-2 p-4"><span>{items.filter((i) => i.enquiry_id === e.id).map((i) => `${num(i.qty)} ${i.unit} ${mats.find((m) => m.id === i.material_id)?.name}`).join(", ")}</span><Chip tone={e.status === "quoted" ? "blue" : "amber"}>{e.status === "quoted" ? "Quoted" : "Sent"} · {sdate(e.created_at)}</Chip></div>)}</div></section>)}
      </div>)}

      {tab === "orders" && (<div className="mt-6 space-y-3">
        {!ins?.orders.length ? <Empty icon={Package} title="No orders yet" /> : ins.orders.map((o) => (
          <div key={o.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="display text-lg font-medium">{o.material.name} · {num(o.qty)} {o.material.unit}</div><div className="text-sm text-ink2">{o.number} · {fdate(o.date)}</div></div><Chip tone={o.status === "closed" ? "grey" : o.pending === 0 ? "green" : "blue"}>{o.status === "closed" ? "Completed" : o.received ? `${o.pct}% delivered` : "Confirmed"}</Chip></div>
            <div className="mt-4"><Bar pct={o.pct} /></div><div className="mt-1 text-sm text-ink2">{num(o.received)} of {num(o.qty)} {o.material.unit} delivered</div>
            {o.deliveries.length > 0 && <ol className="mt-4 space-y-2 border-l-2 border-line pl-4">{[...o.deliveries].reverse().map((d) => <li key={d.id} className="text-sm"><span className="font-medium">{num(d.qty)} {o.material.unit}</span> · {sdate(d.bill_date)} · {d.vehicle_no}{d.eway_no ? ` · e-way ${d.eway_no}` : ""}</li>)}</ol>}
          </div>))}
      </div>)}

      {tab === "documents" && (<div className="mt-6 space-y-6">
        <section><h2 className="mb-3 text-lg font-medium">Contracts</h2>{!contracts.length ? <Empty icon={FileSignature} title="No contracts yet" /> : <div className="space-y-2">{contracts.filter((c) => c.status !== "draft" && c.status !== "cancelled").map((c) => <Link key={c.id} href={`/account/contracts/${c.id}`} className="card flex items-center justify-between gap-3 p-4"><span className="flex items-center gap-3"><FileSignature size={18} className="text-ink2" />{c.number}</span><Chip tone={c.status === "signed" ? "green" : "amber"}>{c.status === "signed" ? `Signed ${sdate(c.signed_at)}` : "Waiting for you"}</Chip></Link>)}</div>}</section>
        <section><h2 className="mb-3 text-lg font-medium">Invoices</h2>{!ins?.invoices.length ? <Empty icon={FileText} title="No invoices yet" /> : <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Invoice</th><th>Date</th><th className="num">Amount</th><th>Status</th></tr></thead><tbody>{ins.invoices.map((i) => <tr key={i.id}><td><Link href={`/account/invoices/${i.id}`} className="font-medium text-pri underline-offset-2 hover:underline">{i.number}</Link></td><td>{sdate(i.date)}</td><td className="num">{inr(i.total)}</td><td><Chip tone={i.status === "paid" ? "green" : i.overdue ? "red" : "amber"}>{i.status === "paid" ? "Paid" : i.overdue ? `${i.overdue} days late` : `Due ${sdate(i.due_date)}`}</Chip></td></tr>)}</tbody></table></div>}</section>
      </div>)}

      {tab === "profile" && (<div className="mt-6 max-w-xl"><div className="card p-6"><ProfileForm p={me.profile} /></div><form action={signOut} className="mt-4"><button className="btn btn-outline">Sign out</button></form></div>)}
    </div>
  );
}
function Card({ icon: Icon, label, value, hint }: { icon: typeof TrendingUp; label: string; value: string; hint?: string }) {
  return <div className="p-5"><div className="flex items-center gap-2 text-sm font-semibold text-ink2"><Icon size={16} />{label}</div><div className="mt-3 text-xl font-extrabold leading-tight sm:text-2xl" style={{ fontStretch: "112%" }}>{value}</div>{hint && <div className="mt-1 text-sm text-ink2">{hint}</div>}</div>;
}
