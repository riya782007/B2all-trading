import Link from "next/link";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { balances } from "@/lib/domain";
import { inr } from "@/lib/money";
import { Denied, Page } from "@/components/ui";
export default async function Ledgers() {
  if (!(await staff("accounts"))) return <Denied />;
  const rows = await balances(await getStore());
  const groups = [...new Set(rows.map((r) => r.grp))];
  return (
    <Page title="Ledgers" sub="Grouped the way Tally groups them. Party ledgers are created automatically.">
      <div className="grid gap-4 md:grid-cols-2">{groups.map((g) => { const ls = rows.filter((r) => r.grp === g); const tot = ls.reduce((t, l) => t + l.closing, 0); return (
        <div key={g} className="card overflow-hidden"><div className="flex justify-between bg-s2 px-5 py-3 text-sm font-medium"><span>{g}</span><span className="tabular-nums">{inr(Math.abs(tot))} {tot >= 0 ? "Dr" : "Cr"}</span></div>
          <div className="divide-y divide-line">{ls.map((l) => <Link key={l.id} href={`/owner/accounts/ledgers/${l.id}`} className="flex justify-between px-5 py-2.5 text-sm hover:bg-s2"><span>{l.name}</span><span className="tabular-nums text-ink2">{l.closing ? `${inr(Math.abs(l.closing))} ${l.closing > 0 ? "Dr" : "Cr"}` : "-"}</span></Link>)}</div></div>); })}</div>
    </Page>
  );
}
