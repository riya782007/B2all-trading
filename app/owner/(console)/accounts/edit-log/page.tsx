import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Denied, Empty, Page } from "@/components/ui";
const NAMES: Record<string, string> = { vouchers: "Voucher", invoices: "Invoice / bill", ledgers: "Ledger", parties: "Customer / supplier", materials: "Material", orders: "Order", deliveries: "Dispatch / receipt", contracts: "Contract", company: "Company settings", bank_reco: "Bank reconciliation", roles: "Role" };
const label = (r?: Record<string, unknown> | null) => r ? String(r.number ?? r.name ?? r.bill_no ?? r.title ?? r.id ?? "") : "";
function diff(a?: Record<string, unknown> | null, b?: Record<string, unknown> | null) {
  if (!a || !b) return [];
  return Object.keys({ ...a, ...b }).filter((k) => !["updated_at"].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => ({ k, from: JSON.stringify(a[k] ?? null), to: JSON.stringify(b[k] ?? null) }));
}
export default async function EditLog({ searchParams }: { searchParams: Promise<{ t?: string; a?: string; from?: string; to?: string }> }) {
  if (!(await staff("accounts"))) return <Denied />;
  const sp = await searchParams; const s = await getStore();
  let rows; try { rows = await s.all("audit_log"); } catch { return <Page title="Edit log"><Empty icon={ShieldCheck} title="Install the latest database update">Run 006_tally_offers.sql in Supabase. From then on every change is recorded permanently.</Empty></Page>; }
  rows = rows.filter((r) => (!sp.t || r.table_name === sp.t) && (!sp.a || r.action === sp.a) && (!sp.from || r.at.slice(0, 10) >= sp.from) && (!sp.to || r.at.slice(0, 10) <= sp.to)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 500);
  return (
    <Page title="Edit log (audit trail)" sub="Every record created, changed or deleted, with who did it and when. It cannot be switched off, edited or deleted, which is what the MCA audit trail rule (from 1 April 2023) requires.">
      <form className="mb-4 flex flex-wrap items-end gap-2"><label className="field"><span>Record</span><select name="t" defaultValue={sp.t ?? ""} className="input"><option value="">All</option>{Object.entries(NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span>Action</span><select name="a" defaultValue={sp.a ?? ""} className="input"><option value="">All</option><option value="insert">Created</option><option value="update">Changed</option><option value="delete">Deleted</option></select></label>
        <label className="field"><span>From</span><input type="date" name="from" defaultValue={sp.from} className="input" /></label><label className="field"><span>To</span><input type="date" name="to" defaultValue={sp.to} className="input" /></label><button className="btn btn-outline">Filter</button></form>
      {!rows.length ? <Empty icon={ShieldCheck} title="Nothing recorded for this filter" /> :
      <div className="card divide-y divide-line">{rows.map((r) => { const d = r.action === "update" ? diff(r.old_row, r.new_row) : []; return (
        <div key={String(r.id)} className="px-5 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><span className={`chip ${r.action === "insert" ? "chip-green" : r.action === "update" ? "chip-amber" : "chip-red"}`}>{r.action === "insert" ? "Created" : r.action === "update" ? "Changed" : "Deleted"}</span><b>{NAMES[r.table_name] ?? r.table_name}</b>{r.table_name === "vouchers" ? <Link className="text-pri underline" href={`/owner/accounts/v/${r.row_id}`}>{label(r.new_row ?? r.old_row)}</Link> : <span>{label(r.new_row ?? r.old_row)}</span>}<span className="ml-auto text-xs text-ink2">{r.actor_name ?? "system"} · {new Date(r.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></div>
          {d.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-ink2">{d.slice(0, 8).map((x) => <li key={x.k}><b>{x.k}</b>: {x.from.slice(0, 80)} → {x.to.slice(0, 80)}</li>)}</ul>}
        </div>); })}</div>}
    </Page>
  );
}
