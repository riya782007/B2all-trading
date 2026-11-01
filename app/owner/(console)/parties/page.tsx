import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews, orderViews } from "@/lib/domain";
import { inr, sdate } from "@/lib/money";
import { Chip, Denied, Empty, Page } from "@/components/ui";

export default async function Parties({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const sp = await searchParams; const type = sp.type === "supplier" ? "supplier" : "customer"; const q = (sp.q ?? "").toLowerCase();
  const me = await staff(type === "customer" ? "crm" : "purchase"); if (!me) return <Denied />;
  const s = await getStore();
  const [ps, inv, ov] = await Promise.all([s.all("parties", { type }), invoiceViews(s), orderViews(s)]);
  const rows = ps.filter((p) => !q || `${p.name} ${p.city} ${p.phone} ${p.gstin}`.toLowerCase().includes(q)).map((p) => {
    const mi = inv.filter((i) => i.party_id === p.id); const mo = ov.filter((o) => o.party_id === p.id);
    return { p, billed: mi.reduce((t, i) => t + Number(i.total), 0), due: mi.reduce((t, i) => t + i.balance, 0), late: mi.some((i) => i.overdue > 0), last: mo[0]?.date, orders: mo.length };
  }).sort((a, b) => b.billed - a.billed);
  return (
    <Page title={type === "customer" ? "Customers" : "Suppliers"} sub={type === "customer" ? "Everyone who buys from you, including website sign-ups." : "Everyone you buy from."}
      actions={allowed(me, type === "customer" ? "crm" : "purchase", "create") && <Link href={`/owner/parties/new?type=${type}`} className="btn btn-filled"><Plus size={18} />Add</Link>}>
      <form className="mb-4"><input type="hidden" name="type" value={type} /><input name="q" defaultValue={sp.q} placeholder="Search name, city, phone, GSTIN" className="input max-w-md" aria-label="Search" /></form>
      {!rows.length ? <Empty icon={Users} title="Nobody here yet" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr><th>Name</th><th>City</th><th className="num">Orders</th><th className="num">Billed</th><th className="num">{type === "customer" ? "To receive" : "To pay"}</th><th>Last order</th></tr></thead><tbody>
          {rows.map(({ p, billed, due, late, last, orders }) => <tr key={p.id}><td><Link href={`/owner/parties/${p.id}`} className="flex items-center gap-3 font-medium hover:underline"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink font-semibold text-s1">{p.name.charAt(0)}</span>{p.name}</Link></td><td>{p.city ?? "-"}</td><td className="num">{orders}</td><td className="num">{inr(billed)}</td><td className="num">{due > 0 ? <span className={late ? "font-medium text-err" : ""}>{inr(due)}</span> : "-"}</td><td>{last ? sdate(last) : <Chip>New</Chip>}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
