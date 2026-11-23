import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews, orderViews } from "@/lib/domain";
import { applyFilter, personas, type Filter } from "@/lib/crm";
import { Megaphone, Download, Globe } from "lucide-react";
import { inr, sdate } from "@/lib/money";
import { Chip, Denied, Empty, Page } from "@/components/ui";

export default async function Parties({ searchParams }: { searchParams: Promise<Filter & { type?: string }> }) {
  const sp = await searchParams; const type = sp.type === "supplier" ? "supplier" : "customer"; const q = (sp.q ?? "").toLowerCase();
  const me = await staff(type === "customer" ? "crm" : "purchase"); if (!me) return <Denied />;
  const s = await getStore();
  if (sp.type !== "supplier") return <Customers sp={sp} canAdd={allowed(me, "crm", "create")} canOffer={allowed(me, "crm", "create")} />;
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

async function Customers({ sp, canAdd, canOffer }: { sp: Filter; canAdd: boolean; canOffer: boolean }) {
  const s = await getStore();
  const [all, mats] = await Promise.all([personas(s), s.all("materials")]);
  const f: Filter = { q: sp.q, material: sp.material, activity: sp.activity, city: sp.city, tag: sp.tag, dues: sp.dues, source: sp.source };
  const rows = applyFilter(all, f);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const cities = [...new Set(all.map((p) => p.city).filter(Boolean))].sort(), tags = [...new Set(all.flatMap((p) => p.tags))].sort();
  return (
    <Page title="Customers" sub={`${all.length} customers · ${all.filter((p) => p.registered).length} signed up on the website. Every website sign-up becomes a customer here automatically.`}
      actions={<>{canOffer && <Link href={`/owner/offers?${qs}`} className="btn btn-tonal"><Megaphone size={17} />Send an offer to these {rows.length}</Link>}<a href={`/owner/export/customers?${qs}`} className="btn btn-outline"><Download size={17} />Excel</a>{canAdd && <Link href="/owner/parties/new?type=customer" className="btn btn-filled"><Plus size={18} />Add</Link>}</>}>
      <form className="card mb-4 grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-7"><input type="hidden" name="type" value="customer" />
        <input name="q" defaultValue={sp.q} placeholder="Search name, city, phone, tag" className="input lg:col-span-2" aria-label="Search" />
        <select name="source" defaultValue={sp.source ?? ""} className="input" aria-label="Source"><option value="">Any source</option><option value="website">Signed up on website</option><option value="staff">Added by staff</option></select>
        <select name="activity" defaultValue={sp.activity ?? ""} className="input" aria-label="Buying pattern"><option value="">Any pattern</option>{["Due to reorder", "Active", "New", "Slipping", "Dormant", "Never ordered"].map((x) => <option key={x}>{x}</option>)}</select>
        <select name="material" defaultValue={sp.material ?? ""} className="input" aria-label="Has bought"><option value="">Any material</option>{mats.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <select name="city" defaultValue={sp.city ?? ""} className="input" aria-label="City"><option value="">Any city</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="tag" defaultValue={sp.tag ?? ""} className="input" aria-label="Tag"><option value="">Any tag</option>{tags.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="dues" defaultValue={sp.dues ?? ""} className="input" aria-label="Payments"><option value="">Any payment status</option><option value="owes">Has dues</option><option value="overdue">Overdue</option><option value="clear">Nothing due</option></select>
        <button className="btn btn-filled">Filter</button><Link href="/owner/parties?type=customer" className="btn btn-text">Clear</Link></form>
      {!rows.length ? <Empty icon={Users} title="No customers match" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[880px]"><thead><tr><th>Customer</th><th>Pattern</th><th>Buys most</th><th className="num">Orders</th><th className="num">Lifetime</th><th className="num">To receive</th><th>Last order</th></tr></thead><tbody>
          {rows.map((p) => <tr key={p.id}><td><Link href={`/owner/parties/${p.id}`} className="font-medium hover:underline">{p.name}</Link><div className="flex items-center gap-1 text-xs text-ink2">{p.registered && <Globe size={12} aria-label="Website account" />}{[p.city, p.phone].filter(Boolean).join(" · ")}{p.tags.length ? ` · ${p.tags.join(", ")}` : ""}</div></td>
            <td><Chip tone={p.segment === "Due to reorder" ? "green" : p.segment === "Slipping" || p.segment === "Dormant" ? "amber" : "grey"}>{p.segment}</Chip></td><td className="text-sm">{p.topMaterial || "-"}</td><td className="num">{p.orders}</td><td className="num">{inr(p.spendAll)}</td>
            <td className="num">{p.outstanding > 0 ? <span className={p.overdue ? "font-medium text-err" : ""}>{inr(p.outstanding)}</span> : "-"}</td><td>{p.lastOrder ? sdate(p.lastOrder) : "-"}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
