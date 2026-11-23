import SalesChart from "@/components/console/SalesChart";
import Link from "next/link";
import { Inbox, Truck, ReceiptIndianRupee, AlertTriangle, Wallet, ArrowRight, FileSignature, Boxes, CalendarDays, Plus } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews, orderViews, outstanding, stock } from "@/lib/domain";
import { fy, inr, num, sdate, today, addDays, r2 } from "@/lib/money";
import { Bar, Chip, Empty, Page, Section, Stat } from "@/components/ui";
import { personas } from "@/lib/crm";
import { Megaphone } from "lucide-react";

export default async function Home() {
  const me = (await staff())!;
  const s = await getStore();
  const canSales = allowed(me,"sales"), canPurchase = allowed(me,"purchase"), canAccounts = allowed(me,"accounts"), canStock = allowed(me,"inventory");
  const [visibleOrders, inv, enq, contracts, st] = await Promise.all([(canSales||canPurchase||canAccounts||canStock) ? orderViews(s) : Promise.resolve([]), (canSales||canPurchase||canAccounts) ? invoiceViews(s) : Promise.resolve([]), allowed(me,"crm") ? s.all("enquiries", { status: "new" }) : Promise.resolve([]), canSales ? s.all("contracts") : Promise.resolve([]), canStock ? stock(s) : Promise.resolve([])]);
  const ov = visibleOrders.filter(o => o.kind === "sale" ? canSales : canPurchase);
  const [rec, pay] = await Promise.all([canAccounts ? outstanding(s, "sale") : Promise.resolve({ rows: [], total: 0 }), canAccounts ? outstanding(s, "purchase") : Promise.resolve({ rows: [], total: 0 })]);
  const f = fy(); const salesFY = inv.filter((i) => i.kind === "sale" && fy(i.date) === f).reduce((t, i) => t + Number(i.taxable), 0);
  const open = ov.filter((o) => o.status === "open");
  const tasks: { icon: typeof Inbox; text: string; href: string; tone: "red" | "amber" | "blue" }[] = [];
  if (enq.length && allowed(me, "crm")) tasks.push({ icon: Inbox, text: `${enq.length} new enquir${enq.length > 1 ? "ies" : "y"} from the website`, href: "/owner/enquiries", tone: "blue" });
  if (allowed(me, "crm", "create")) {
    const people = await personas(s); const dueSoon = people.filter((p) => p.segment === "Due to reorder"), slipping = people.filter((p) => p.segment === "Slipping");
    if (dueSoon.length) tasks.push({ icon: Megaphone, text: `${dueSoon.length} customer${dueSoon.length > 1 ? "s are" : " is"} due to reorder (${dueSoon.slice(0, 2).map((p) => p.name).join(", ")}${dueSoon.length > 2 ? "…" : ""}). Send an offer now`, href: "/owner/offers?activity=Due%20to%20reorder", tone: "blue" });
    if (slipping.length) tasks.push({ icon: Megaphone, text: `${slipping.length} customer${slipping.length > 1 ? "s have" : " has"} not ordered for longer than usual. Win them back`, href: "/owner/offers?activity=Slipping", tone: "amber" });
  }
  ov.filter((o) => o.over > 0).forEach((o) => tasks.push({ icon: AlertTriangle, text: `${o.number}: ${num(o.over)} ${o.material.unit} more than ordered`, href: `/owner/orders/${o.id}`, tone: "red" }));
  ov.filter((o) => o.kind === "sale" && o.unbilled > 0).forEach((o) => tasks.push({ icon: ReceiptIndianRupee, text: `${o.number}: ${num(o.unbilled)} ${o.material.unit} dispatched but not invoiced`, href: `/owner/invoices/new?kind=sale&order=${o.id}`, tone: "amber" }));
  ov.filter((o) => o.kind === "purchase" && o.unbilled > 0).forEach((o) => tasks.push({ icon: ReceiptIndianRupee, text: `${o.number}: ${num(o.unbilled)} ${o.material.unit} received, supplier bill not entered`, href: `/owner/invoices/new?kind=purchase&order=${o.id}`, tone: "amber" }));
  rec.rows.filter((r) => r.overdue > 0).forEach((r) => tasks.push({ icon: Wallet, text: `${r.party.name} owes ${inr(r.balance)} on ${r.number}, ${r.overdue} days late`, href: `/owner/parties/${r.party_id}`, tone: "red" }));
  contracts.filter((c) => c.status === "draft").forEach((c) => tasks.push({ icon: FileSignature, text: `Contract ${c.number} is ready to send`, href: `/owner/contracts/${c.id}`, tone: "blue" }));
  st.filter((m) => m.projected < 0).forEach((m) => tasks.push({ icon: Boxes, text: `${m.name}: open sales exceed stock by ${num(-m.projected)} ${m.unit}`, href: "/owner/stock", tone: "red" }));
  const dates = Array.from({length:7},(_,i)=>addDays(today(),i-6));
  const days = dates.map(date=>({date,value:r2(inv.filter(i=>i.kind==="sale" && i.date===date).reduce((n,i)=>n+Number(i.taxable),0))}));
  const quick = [
    ...(allowed(me,"sales","create")?[{href:"/owner/orders/new?kind=sale",label:"New sales order",icon:Plus}]:[]),
    ...(allowed(me,"purchase","create")?[{href:"/owner/invoices/new?kind=purchase",label:"Enter supplier bill",icon:ReceiptIndianRupee}]:[]),
    ...(allowed(me,"inventory","create")?[{href:"/owner/deliveries/new",label:"Record a truck",icon:Truck}]:[]),
    ...(allowed(me,"accounts","create")?[{href:"/owner/accounts/new?type=receipt",label:"Record payment",icon:Wallet}]:[]),
  ];
  return (
    <Page title="A clear view of your business." sub={`Welcome back, ${me.profile.name.split(" ")[0]}. Here’s what needs your attention today.`} actions={<span className="flex items-center gap-2 rounded-lg border border-line bg-s1 px-3 py-2.5 text-xs text-ink2"><CalendarDays size={15}/>{new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date())}</span>}>
      <div className="statrow">
        {canSales && <Stat icon={ReceiptIndianRupee} label={`Sales this year (${f})`} value={inr(salesFY)} hint="before GST" tone="pri" href="/owner/invoices?kind=sale" />}
        {canAccounts && <Stat icon={Wallet} label="To receive" value={inr(rec.total)} hint={`${rec.rows.length} invoices`} href="/owner/accounts/outstanding" />}
        {canAccounts && <Stat icon={ReceiptIndianRupee} label="To pay" value={inr(pay.total)} hint={`${pay.rows.length} bills`} href="/owner/accounts/outstanding?kind=purchase" />}
        {(canSales || canPurchase) && <Stat icon={Boxes} label="Open orders" value={open.length} hint={`${open.filter((o) => o.kind === "sale").length} sales · ${open.filter((o) => o.kind === "purchase").length} purchase`} href={canSales ? "/owner/orders?kind=sale" : "/owner/orders?kind=purchase"} />}
      </div>
      <div className={`mt-6 grid items-start gap-5 ${canSales?"xl:grid-cols-[1.65fr_1fr]":""}`}>
        {canSales&&<section className="card p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-base">Sales at a glance</h2><p className="mt-1 text-xs text-ink2">Invoiced sales before GST · Last 7 days</p></div><Link href="/owner/invoices?kind=sale" className="text-xs text-pri">View invoices →</Link></div><div className="my-5 text-[1.8rem] font-semibold tracking-tight">{inr(r2(days.reduce((n,d)=>n+d.value,0)))}</div><SalesChart days={days}/>{days.every(d=>d.value===0)&&<p className="mt-3 text-xs text-ink2">No sales invoices in this period.</p>}</section>}
        <section className="card overflow-hidden"><div className="flex items-center justify-between px-5 pb-3 pt-5"><h2 className="text-base">Needs your attention</h2><Chip>{tasks.length}</Chip></div>
          {tasks.length?<div>{tasks.slice(0,4).map((t,i)=>{const Icon=t.icon;return <Link key={i} href={t.href} className="flex items-center gap-3 px-5 py-3 hover:bg-s2"><span className={`grid size-9 shrink-0 place-items-center rounded-lg chip-${t.tone}`}><Icon size={17}/></span><span className="flex-1 text-xs leading-relaxed">{t.text}</span><ArrowRight size={14} className="shrink-0 text-ink2"/></Link>})}</div>:<p className="p-5 text-sm text-ink2">You’re all caught up. New exceptions will appear here.</p>}
          {tasks.length>4&&<details className="mx-5 my-3 text-xs"><summary className="cursor-pointer py-2 text-pri">View {tasks.length-4} more actions</summary>{tasks.slice(4).map((t,i)=><Link className="block border-t border-line py-3 text-ink2 hover:text-pri" key={i} href={t.href}>{t.text} →</Link>)}</details>}
          {canPurchase&&<Link href="/owner/matching" className="m-5 block rounded-lg bg-s2 p-4"><p className="text-[10px] font-semibold uppercase tracking-widest text-pri">Keep bills in step with stock</p><p className="mt-2 text-xs leading-relaxed text-ink2">{ov.filter(o=>o.kind==="purchase"&&o.unbilled>0).length} purchase orders have goods awaiting supplier bills.</p><span className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-pri">Open bill matching<ArrowRight size={13}/></span></Link>}
        </section>
      </div>
      {!!quick.length&&<div className="my-6 flex flex-wrap items-center gap-3"><span className="mr-1 text-xs text-ink2">Quick actions</span>{quick.map(({href,label,icon:Icon})=><Link className="flex min-h-11 flex-1 items-center gap-3 whitespace-nowrap rounded-lg border border-line bg-s1 px-4 py-3 text-xs hover:bg-s2" href={href} key={href}><Icon size={16} className="text-pri"/>{label}<ArrowRight size={14} className="ml-auto text-ink2"/></Link>)}</div>}
      <div className="dashboard-lower">
      <Section title="Orders in progress" action={<Link href={canSales?"/owner/orders?kind=sale":"/owner/orders?kind=purchase"} className="btn btn-text btn-sm">All orders</Link>}>
        {!open.length && <Empty icon={Boxes} title="No open orders">New orders will appear here.</Empty>}
        <div className="grid gap-3 md:grid-cols-2">{open.slice(0, 6).map((o) => (
          <Link key={o.id} href={`/owner/orders/${o.id}`} className="card block p-5 hover:shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate font-medium">{o.party.name}</div><div className="text-sm text-ink2">{o.number} · {o.material.name}</div></div><Chip tone={o.kind === "sale" ? "green" : "blue"}>{o.kind === "sale" ? "Sale" : "Purchase"}</Chip></div>
            <div className="mt-4"><Bar pct={o.pct} tone={o.over ? "err" : "pri"} /></div>
            <div className="mt-2 flex justify-between text-sm"><span>{num(o.received)} / {num(o.qty)} {o.material.unit}</span><span className={o.over ? "text-err" : "text-ink2"}>{o.over ? `${num(o.over)} over` : `${num(o.pending)} pending`}</span></div>
          </Link>))}</div>
      </Section>
      <Section title="Latest dispatches and receipts" action={<Link href="/owner/deliveries" className="btn btn-text btn-sm">All</Link>}>
        <div className="card divide-y divide-line">{ov.flatMap((o) => o.deliveries.map((d) => ({ d, o }))).sort((a, b) => b.d.created_at.localeCompare(a.d.created_at)).slice(0, 5).map(({ d, o }) => <div key={d.id} className="flex items-center gap-4 px-5 py-3"><Truck size={18} className="text-ink2" /><div className="flex-1 text-sm"><span className="font-medium">{num(d.qty)} {o.material.unit} {o.material.name}</span> · {o.kind === "sale" ? "to" : "from"} {o.party.name}</div><span className="text-sm text-ink2">{d.vehicle_no} · {sdate(d.bill_date)}</span></div>)}</div>
      </Section>
      </div>
    </Page>
  );
}
