import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil, Plus, Wallet } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { insights, invoiceViews, orderViews, partyLedger, statement } from "@/lib/domain";
import { STATES, inr, num, sdate } from "@/lib/money";
import { wa } from "@/lib/links";
import { Bar, Chip, Denied, Page, Section, Stat } from "@/components/ui";

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const s = await getStore();
  const p = await s.one("parties", id); if (!p) notFound();
  const me = await staff(p.type === "customer" ? "crm" : "purchase"); if (!me) return <Denied />;
  const [ov, inv, ins] = await Promise.all([orderViews(s), invoiceViews(s), p.type === "customer" ? insights(s, p.id) : Promise.resolve(null)]);
  const orders = ov.filter((o) => o.party_id === id), invs = inv.filter((i) => i.party_id === id);
  const st = allowed(me, "accounts") ? await statement(s, (await partyLedger(s, p)).id) : null;
  const bal = st?.closing ?? 0;
  return (
    <Page title={p.name} sub={[p.city, p.gstin ? `GSTIN ${p.gstin}` : p.state_code ? STATES[p.state_code] : null, p.phone].filter(Boolean).join(" · ")} back={{ href: `/owner/parties?type=${p.type}`, label: p.type === "customer" ? "Customers" : "Suppliers" }}
      actions={<>
        {p.phone && <a className="btn btn-outline" target="_blank" rel="noreferrer" href={wa(p.phone, `Hello ${p.name}, `)}><MessageCircle size={18} />WhatsApp</a>}
        <Link className="btn btn-outline" href={`/owner/parties/new?id=${p.id}&type=${p.type}`}><Pencil size={16} />Edit</Link>
        {allowed(me, p.type === "customer" ? "sales" : "purchase", "create") && <Link className="btn btn-filled" href={`/owner/orders/new?kind=${p.type === "customer" ? "sale" : "purchase"}&party=${p.id}`}><Plus size={18} />Order</Link>}
      </>}>
      <div className="statrow">
        <Stat label="Billed in total" value={inr(invs.reduce((t, i) => t + Number(i.total), 0))} hint={`${invs.length} ${p.type === "customer" ? "invoices" : "bills"}`} />
        <Stat label={p.type === "customer" ? "To receive" : "To pay"} value={inr(invs.reduce((t, i) => t + i.balance, 0))} tone={invs.some((i) => i.overdue) ? "err" : "ter"} hint={invs.some((i) => i.overdue) ? "Some are late" : "On time"} />
        <Stat label="Ledger balance" value={inr(Math.abs(bal))} hint={bal > 0 ? "Dr · they owe you" : bal < 0 ? "Cr · you owe them" : "Settled"} />
        <Stat label="Orders" value={orders.length} hint={orders[0] ? `Last ${sdate(orders[0].date)}` : "None yet"} />
      </div>
      {ins && ins.orders.length > 0 && <div className="card mt-4 grid gap-4 p-5 md:grid-cols-3">
        <div><div className="text-sm text-ink2">Buying rhythm</div><div className="display text-xl font-medium">{ins.avgGap ? `Every ${ins.avgGap} days` : "One order so far"}</div>{ins.nextExpected && <div className="text-sm text-ink2">Next likely around {sdate(ins.nextExpected)}</div>}</div>
        <div><div className="text-sm text-ink2">Typical order</div><div className="display text-xl font-medium">{num(ins.avgOrder)} {ins.top?.m.unit}</div><div className="text-sm text-ink2">Mostly {ins.top?.m.name}</div></div>
        <div className="space-y-2">{ins.byMat.slice(0, 3).map((x) => <div key={x.m.id}><div className="flex justify-between text-sm"><span>{x.m.name}</span><span className="text-ink2">{Math.round((x.qty / ins.totalQty) * 100)}%</span></div><Bar pct={(x.qty / ins.totalQty) * 100} /></div>)}</div>
      </div>}
      <Section title="Orders">{orders.length ? <div className="card divide-y divide-line">{orders.map((o) => <Link key={o.id} href={`/owner/orders/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-s2"><span className="w-44 font-medium">{o.number}</span><span className="flex-1">{num(o.qty)} {o.material.unit} {o.material.name}</span><span className="w-28"><Bar pct={o.pct} tone={o.over ? "err" : "pri"} /></span><Chip tone={o.status === "open" ? "blue" : "grey"}>{o.status}</Chip></Link>)}</div> : <p className="card-tonal p-5 text-ink2">No orders yet.</p>}</Section>
      <Section title={p.type === "customer" ? "Invoices" : "Bills"} action={invs.some((i) => i.balance > 0) && allowed(me, "accounts", "create") && <Link className="btn btn-tonal btn-sm" href={`/owner/accounts/new?type=${p.type === "customer" ? "receipt" : "payment"}&party=${p.id}`}><Wallet size={16} />{p.type === "customer" ? "Record payment" : "Pay"}</Link>}>
        {invs.length ? <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Number</th><th>Date</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th></tr></thead><tbody>{invs.map((i) => <tr key={i.id}><td><Link className="font-medium text-pri hover:underline" href={`/owner/invoices/${i.id}`}>{i.number}</Link></td><td>{sdate(i.date)}</td><td className="num">{inr(i.total)}</td><td className="num">{inr(i.balance)}</td><td><Chip tone={i.status === "paid" ? "green" : i.overdue ? "red" : "amber"}>{i.status === "paid" ? "Paid" : i.overdue ? `${i.overdue}d late` : "Due"}</Chip></td></tr>)}</tbody></table></div> : <p className="card-tonal p-5 text-ink2">Nothing billed yet.</p>}
      </Section>
      {st && st.lines.length > 0 && <Section title="Ledger" action={<Link className="btn btn-text btn-sm" href={`/owner/accounts/ledgers/${st.ledger.id}`}>Full statement</Link>}><div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Date</th><th>Voucher</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead><tbody>{st.lines.slice(-8).map((l, i) => <tr key={i}><td>{sdate(l.v.date)}</td><td>{l.v.number} <span className="text-ink2">· {l.v.type}</span></td><td className="num">{l.dr ? inr(l.dr) : ""}</td><td className="num">{l.cr ? inr(l.cr) : ""}</td><td className="num">{inr(Math.abs(l.run))} {l.run >= 0 ? "Dr" : "Cr"}</td></tr>)}</tbody></table></div></Section>}
    </Page>
  );
}
