import Link from "next/link";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { company, invoiceViews } from "@/lib/domain";
import { VKEY, VLABEL, isCashBank } from "@/lib/books";
import { today } from "@/lib/money";
import type { VType } from "@/lib/types";
import { Denied, Page } from "@/components/ui";
import Entry from "./entry";
import Note from "./note";

const TYPES: VType[] = ["contra", "payment", "receipt", "journal", "sales", "purchase", "credit_note", "debit_note"];
export default async function VoucherEntry({ searchParams }: { searchParams: Promise<{ type?: string; amount?: string; date?: string; narration?: string; invoice?: string; party?: string }> }) {
  const me = await staff("accounts", "create"); if (!me) return <Denied />;
  const sp = await searchParams; const type = (TYPES.includes(sp.type as VType) ? sp.type : "payment") as VType;
  const s = await getStore();
  const [ledgers, bills, parties, co] = await Promise.all([s.all("ledgers"), invoiceViews(s), s.all("parties"), company(s)]);
  const pending = bills.filter((b) => b.balance > 0).map((b) => ({ id: b.id, number: b.number, party_id: b.party_id, kind: b.kind, balance: b.balance, date: b.date, gst_rate: Number(b.gst_rate), taxable: Number(b.taxable), qty: Number(b.qty), rate: Number(b.rate) }));
  const tab = (t: VType) => t === "sales" ? "/owner/invoices/new?kind=sale" : t === "purchase" ? "/owner/invoices/new?kind=purchase" : `/owner/accounts/voucher?type=${t}`;
  return (
    <Page title={`${VLABEL[type]} voucher`} sub={`Tally keys work here: F4 Contra · F5 Payment · F6 Receipt · F7 Journal · F8 Sales · F9 Purchase · Ctrl+F8 Credit Note · Ctrl+F9 Debit Note · Ctrl+A save · Esc back.${co.books_locked_till ? ` Books are locked up to ${co.books_locked_till}.` : ""}`} back={{ href: "/owner/accounts", label: "Day book" }}>
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Voucher type">{TYPES.map((t) => <Link key={t} href={tab(t)} className="filter" aria-current={t === type}><kbd className="mr-1.5 rounded bg-s2 px-1 text-[10px] font-semibold text-ink2">{VKEY[t]}</kbd>{VLABEL[t]}</Link>)}</nav>
      {type === "credit_note" || type === "debit_note"
        ? <Note kind={type} date={sp.date || today()} parties={parties.filter((p) => p.type === (type === "credit_note" ? "customer" : "supplier")).map((p) => ({ id: p.id, name: p.name }))} bills={pending.filter((b) => b.kind === (type === "credit_note" ? "sale" : "purchase"))} invoice={sp.invoice} party={sp.party} />
        : <Entry key={type} type={type as "contra" | "payment" | "receipt" | "journal"} date={sp.date || today()} amount={sp.amount} narration={sp.narration}
            ledgers={ledgers.map((l) => ({ id: l.id, name: l.name, grp: l.grp, party_id: l.party_id ?? null, cash: isCashBank(l) })).sort((a, b) => a.name.localeCompare(b.name))}
            bills={pending} />}
    </Page>
  );
}
