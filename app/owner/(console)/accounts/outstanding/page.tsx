import Link from "next/link";
import { MessageCircle, Clock } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { outstanding } from "@/lib/domain";
import { inr, sdate } from "@/lib/money";
import { wa } from "@/lib/links";
import { Chip, Denied, Empty, Filters, Page, Section } from "@/components/ui";
import { company } from "@/lib/domain";
import Queue from "../../offers/[id]/queue";
export default async function Outstanding({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  if (!(await staff("accounts"))) return <Denied />;
  const kind = (await searchParams).kind === "purchase" ? "purchase" : "sale";
  const st = await getStore(); const o = await outstanding(st, kind); const co = await company(st);
  const max = Math.max(1, ...o.buckets.map((b) => b.amt));
  return (
    <Page title="Outstanding" sub="Bill by bill, oldest first, with ageing.">
      <Filters current={kind} items={[{ key: "sale", label: "To receive", href: "/owner/accounts/outstanding" }, { key: "purchase", label: "To pay", href: "/owner/accounts/outstanding?kind=purchase" }]} />
      <div className="card mb-5 p-5"><div className="flex items-baseline justify-between"><div className="text-ink2">{kind === "sale" ? "Total to receive" : "Total to pay"}</div><div className="display text-3xl font-medium">{inr(o.total)}</div></div>
        <div className="mt-5 grid grid-cols-5 gap-2">{o.buckets.map((b, i) => <div key={b.b}><div className="flex h-24 items-end"><div className={`w-full rounded-t-lg ${i === 0 ? "bg-pri/70" : i < 2 ? "bg-ter/70" : "bg-err/70"}`} style={{ height: `${(b.amt / max) * 100}%`, minHeight: b.amt ? 6 : 2 }} /></div><div className="mt-2 text-xs text-ink2">{b.b}</div><div className="text-sm font-medium">{inr(b.amt)}</div></div>)}</div></div>
      {kind === "sale" && (() => {
        // One message per customer, listing every overdue bill, so nobody gets five separate reminders.
        const due = o.rows.filter((r) => r.overdue > 0);
        const byParty = [...new Set(due.map((r) => r.party_id))].map((pid) => { const bills = due.filter((r) => r.party_id === pid); const p = bills[0].party; const total = bills.reduce((t, r) => t + r.balance, 0);
          const text = `Dear ${p.name},\n\nA friendly reminder of payments now due to ${co.name || "B2All"}:\n${bills.map((b) => `• ${b.number} dated ${sdate(b.date)}: ${inr(b.balance)} (due ${sdate(b.due_date)})`).join("\n")}\nTotal: ${inr(total)}\n${co.bank ? `\nBank: ${co.bank}\n` : ""}\nIf already paid, please share the UTR and we will update our books. Thank you.`;
          return { id: pid, name: `${p.name} · ${inr(total)} · ${bills.length} bill${bills.length > 1 ? "s" : ""}`, city: p.city ?? "", phone: p.whatsapp || p.phone || "", email: p.email ?? "", subject: `Payment reminder: ${inr(total)} due`, text }; });
        return byParty.length > 0 && <Section title={`Payment reminders · ${byParty.length} customer${byParty.length > 1 ? "s" : ""} overdue`}><p className="mb-3 text-sm text-ink2">One polite message per customer listing every overdue bill and your bank details. Press “Send next” and WhatsApp opens with it typed in.</p><Queue rows={byParty} channel="whatsapp" title="Payment reminders" /></Section>;
      })()}
      <div className="mt-6" />
      {!o.rows.length ? <Empty icon={Clock} title="Nothing outstanding" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr><th>Party</th><th>Bill</th><th>Due</th><th>Age</th><th className="num">Balance</th><th></th></tr></thead><tbody>
          {o.rows.sort((a, b) => b.overdue - a.overdue).map((r) => <tr key={r.id}><td><Link href={`/owner/parties/${r.party_id}`} className="font-medium hover:underline">{r.party.name}</Link></td><td><Link href={`/owner/invoices/${r.id}`} className="text-pri hover:underline">{r.number}</Link></td><td>{sdate(r.due_date)}</td><td><Chip tone={r.overdue > 60 ? "red" : r.overdue > 0 ? "amber" : "green"}>{r.bucket}</Chip></td><td className="num font-medium">{inr(r.balance)}</td><td>{kind === "sale" && r.party.phone && <a target="_blank" rel="noreferrer" href={wa(r.party.phone, `Dear ${r.party.name}, a gentle reminder that ${inr(r.balance)} is due on invoice ${r.number} (due ${sdate(r.due_date)}). Thank you, B2All Commo`)} className="btn btn-text btn-sm"><MessageCircle size={16} />Remind</a>}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
