import Link from "next/link";
import { notFound } from "next/navigation";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { VLABEL } from "@/lib/books";
import { fdate, inr, today, words } from "@/lib/money";
import { reverseVoucherAction } from "@/app/books-actions";
import PrintButton from "@/components/PrintButton";
import { Chip, Denied, Notice, Page, Section } from "@/components/ui";

export default async function VoucherView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const [{ id }, sp] = await Promise.all([params, searchParams]); const s = await getStore();
  const v = await s.one("vouchers", id); if (!v) notFound();
  const [ls, party, inv, log, all] = await Promise.all([s.all("ledgers"), v.party_id ? s.one("parties", v.party_id) : null, v.invoice_id ? s.one("invoices", v.invoice_id) : null, s.all("audit_log", { row_id: id }).catch(() => []), s.all("vouchers")]);
  const reversal = all.find((x) => x.narration.startsWith(`Reversal of ${v.number} `));
  const name = (lid: string) => ls.find((l) => l.id === lid)?.name ?? "?";
  return (
    <Page title={`${VLABEL[v.type]} ${v.number}`} sub={`${fdate(v.date)} · entered by ${v.created_by}${party ? ` · ${party.name}` : ""}`} back={{ href: "/owner/accounts", label: "Day book" }} actions={<PrintButton label="Print" />}>
      {sp.saved && <Notice>Voucher saved.</Notice>}{sp.error && <Notice tone="red">{sp.error}</Notice>}
      {reversal && <Notice tone="amber">Reversed by <Link className="underline" href={`/owner/accounts/v/${reversal.id}`}>{reversal.number}</Link>. Both stay in the books, as the law requires.</Notice>}
      <div className="card overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead><tbody>
        {v.entries.map((e, i) => <tr key={i}><td>{e.dr ? "By " : "To "}<Link href={`/owner/accounts/ledgers/${e.ledger_id}`} className="font-medium text-pri hover:underline">{name(e.ledger_id)}</Link></td><td className="num">{e.dr ? inr(e.dr, 2) : ""}</td><td className="num">{e.cr ? inr(e.cr, 2) : ""}</td></tr>)}
        <tr className="font-semibold"><td>Total</td><td className="num">{inr(v.amount, 2)}</td><td className="num">{inr(v.amount, 2)}</td></tr>
      </tbody></table><div className="border-t border-line px-5 py-3 text-sm text-ink2">{words(Number(v.amount))}{v.narration && <div className="mt-1 text-ink">Narration: {v.narration}</div>}{inv && <div className="mt-1">Against bill <Link className="text-pri underline" href={`/owner/invoices/${inv.id}`}>{inv.number}</Link></div>}</div></div>
      <div className="mt-3 flex flex-wrap gap-2"><Chip tone={v.tally_exported ? "green" : "amber"}>{v.tally_exported ? "In Tally" : "Not yet sent to Tally"}</Chip></div>
      {allowed(me, "accounts", "create") && !reversal && !v.narration.startsWith("Reversal of") && (v.invoice_id
        ? <p className="mt-4 text-sm text-ink2">This voucher belongs to a bill. To correct it, raise a <Link className="text-pri underline" href={`/owner/accounts/voucher?type=${v.type === "purchase" || v.type === "payment" ? "debit_note" : "credit_note"}&invoice=${v.invoice_id}`}>{v.type === "purchase" || v.type === "payment" ? "debit" : "credit"} note against it</Link>.</p>
        : <form action={reverseVoucherAction} className="card mt-4 flex flex-wrap items-end gap-3 p-4"><input type="hidden" name="id" value={v.id} /><label className="field"><span>Reverse (cancel) this voucher on</span><input type="date" name="date" defaultValue={today()} className="input" /></label><button className="btn btn-outline">Post reversal entry</button><p className="w-full text-xs text-ink2">Like Tally&apos;s cancel, but the original stays visible. A mirror entry brings every ledger back.</p></form>)}
      <Section title="Edit log for this voucher">{log.length ? <div className="card divide-y divide-line">{log.map((a) => <div key={String(a.id)} className="px-5 py-2.5 text-sm"><b className="capitalize">{a.action}</b> by {a.actor_name ?? "system"} · {new Date(a.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>)}</div> : <p className="text-sm text-ink2">Created once and never changed.</p>}</Section>
    </Page>
  );
}
