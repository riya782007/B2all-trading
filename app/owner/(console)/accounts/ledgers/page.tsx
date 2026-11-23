import Link from "next/link";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { balances } from "@/lib/domain";
import { GROUPS, primaryOf } from "@/lib/books";
import { inr } from "@/lib/money";
import { Denied, Page } from "@/components/ui";
import NewLedger from "./new-ledger";
export default async function Ledgers({ searchParams }: { searchParams: Promise<{ new?: string; q?: string }> }) {
  const me = await staff("accounts"); if (!me) return <Denied />;
  const sp = await searchParams;
  const all = await balances(await getStore());
  const q = sp.q?.toLowerCase().trim();
  const rows = all.filter((r) => !q || r.name.toLowerCase().includes(q) || r.grp.toLowerCase().includes(q));
  const primaries = GROUPS.filter((g) => !g.parent).map((p) => ({ p, ledgers: rows.filter((r) => primaryOf(r.grp)?.name === p.name) })).filter((x) => x.ledgers.length);
  const dc = (n: number) => (n ? `${inr(Math.abs(n), 2)} ${n > 0 ? "Dr" : "Cr"}` : "-");
  return (
    <Page title="Chart of accounts" sub="Tally's 28 groups, the same names your accountant knows. Press Alt+C anywhere to create a ledger."
      actions={<form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Find ledger" className="input" aria-label="Find ledger" /></form>}>
      {allowed(me, "accounts", "create") && <NewLedger key={sp.new ? "open" : "closed"} open={!!sp.new} groups={GROUPS.map((g) => g.name)} />}
      <div className="grid gap-4 md:grid-cols-2">{primaries.map(({ p, ledgers }) => { const tot = ledgers.reduce((t, l) => t + l.closing, 0); const subs = [...new Set(ledgers.map((l) => l.grp))]; return (
        <div key={p.name} className="card overflow-hidden"><div className="flex justify-between bg-s2 px-5 py-3 text-sm font-semibold"><span>{p.name}</span><span className="tabular-nums">{dc(tot)}</span></div>
          {subs.map((g) => <div key={g}>{g !== p.name && <div className="flex justify-between border-t border-line px-5 pt-2 text-xs font-semibold uppercase tracking-wider text-ink2"><span>{g}</span><span className="tabular-nums normal-case">{dc(ledgers.filter((l) => l.grp === g).reduce((t, l) => t + l.closing, 0))}</span></div>}
            <div className="divide-y divide-line">{ledgers.filter((l) => l.grp === g).sort((a, b) => a.name.localeCompare(b.name)).map((l) => <Link key={l.id} href={`/owner/accounts/ledgers/${l.id}`} className="flex justify-between px-5 py-2.5 text-sm hover:bg-s2"><span>{l.name}</span><span className="tabular-nums text-ink2">{dc(l.closing)}</span></Link>)}</div></div>)}
        </div>); })}</div>
    </Page>
  );
}
