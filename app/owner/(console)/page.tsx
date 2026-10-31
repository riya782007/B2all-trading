import Link from "next/link";
import { Inbox, Truck, ReceiptIndianRupee, AlertTriangle, Wallet, ArrowRight, FileSignature, Boxes } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews, orderViews, outstanding, stock } from "@/lib/domain";
import { fy, inr, num, sdate } from "@/lib/money";
import { Bar, Chip, Empty, Page, Section, Stat } from "@/components/ui";

export default async function Home() {
  const me = (await staff())!;
  const s = await getStore();
  const [ov, inv, enq, contracts, st] = await Promise.all([orderViews(s), invoiceViews(s), s.all("enquiries", { status: "new" }), s.all("contracts"), stock(s)]);
  const [rec, pay] = await Promise.all([outstanding(s, "sale"), outstanding(s, "purchase")]);
  const f = fy(); const salesFY = inv.filter((i) => i.kind === "sale" && fy(i.date) === f).reduce((t, i) => t + Number(i.taxable), 0);
  const open = ov.filter((o) => o.status === "open");
  const tasks: { icon: typeof Inbox; text: string; href: string; tone: "red" | "amber" | "blue" }[] = [];
  enq.forEach(() => {}); if (enq.length && allowed(me, "crm")) tasks.push({ icon: Inbox, text: `${enq.length} new enquir${enq.length > 1 ? "ies" : "y"} from the website`, href: "/owner/enquiries", tone: "blue" });
  ov.filter((o) => o.over > 0).forEach((o) => tasks.push({ icon: AlertTriangle, text: `${o.number}: ${num(o.over)} ${o.material.unit} more than ordered`, href: `/owner/orders/${o.id}`, tone: "red" }));
  ov.filter((o) => o.kind === "sale" && o.unbilled > 0).forEach((o) => tasks.push({ icon: ReceiptIndianRupee, text: `${o.number}: ${num(o.unbilled)} ${o.material.unit} dispatched but not invoiced`, href: `/owner/invoices/new?kind=sale&order=${o.id}`, tone: "amber" }));
  ov.filter((o) => o.kind === "purchase" && o.unbilled > 0).forEach((o) => tasks.push({ icon: ReceiptIndianRupee, text: `${o.number}: ${num(o.unbilled)} ${o.material.unit} received, supplier bill not entered`, href: `/owner/invoices/new?kind=purchase&order=${o.id}`, tone: "amber" }));
  rec.rows.filter((r) => r.overdue > 0).forEach((r) => tasks.push({ icon: Wallet, text: `${r.party.name} owes ${inr(r.balance)} on ${r.number}, ${r.overdue} days late`, href: `/owner/parties/${r.party_id}`, tone: "red" }));
  contracts.filter((c) => c.status === "draft").forEach((c) => tasks.push({ icon: FileSignature, text: `Contract ${c.number} is ready to send`, href: `/owner/contracts/${c.id}`, tone: "blue" }));
  st.filter((m) => m.projected < 0).forEach((m) => tasks.push({ icon: Boxes, text: `${m.name}: open sales exceed stock by ${num(-m.projected)} ${m.unit}`, href: "/owner/stock", tone: "red" }));
  const hour = new Date().getHours();
  return (
    <Page title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${me.profile.name.split(" ")[0]}`} sub={tasks.length ? `${tasks.length} things need you today.` : "Everything is up to date."}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Sales this year (${f})`} value={inr(salesFY)} hint="before GST" tone="pri" href="/owner/invoices?kind=sale" />
        <Stat label="To receive" value={inr(rec.total)} hint={`${rec.rows.length} invoices`} href="/owner/accounts/outstanding" />
        <Stat label="To pay" value={inr(pay.total)} hint={`${pay.rows.length} bills`} href="/owner/accounts/outstanding?kind=purchase" />
        <Stat label="Open orders" value={open.length} hint={`${open.filter((o) => o.kind === "sale").length} sales · ${open.filter((o) => o.kind === "purchase").length} purchase`} href="/owner/orders?kind=sale" />
      </div>
      <Section title="Needs you">
        {tasks.length ? <div className="card divide-y divide-line">{tasks.slice(0, 12).map((t, i) => { const I2 = t.icon; return <Link key={i} href={t.href} className="flex items-center gap-4 px-5 py-4 hover:bg-s2"><span className={`grid size-9 shrink-0 place-items-center rounded-full chip-${t.tone}`}><I2 size={17} /></span><span className="flex-1">{t.text}</span><ArrowRight size={16} className="text-ink2" /></Link>; })}</div> : <Empty title="All caught up">New enquiries, unbilled dispatches and late payments will appear here.</Empty>}
      </Section>
      <Section title="Orders in progress" action={<Link href="/owner/orders?kind=sale" className="btn btn-text btn-sm">All orders</Link>}>
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
    </Page>
  );
}
