import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { orderViews } from "@/lib/domain";
import { inr, num, sdate } from "@/lib/money";
import { Bar, Chip, Denied, Empty, Filters, Page } from "@/components/ui";

export default async function Orders({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string }> }) {
  const sp = await searchParams; const kind = sp.kind === "purchase" ? "purchase" : "sale"; const status = sp.status ?? "open";
  const me = await staff(kind === "sale" ? "sales" : "purchase"); if (!me) return <Denied />;
  const rows = (await orderViews(await getStore(), kind)).filter((o) => status === "all" || o.status === status);
  const label = kind === "sale" ? "Sales orders" : "Purchase orders";
  return (
    <Page title={label} sub={kind === "sale" ? "Every customer order with what has been dispatched and billed." : "Every supplier order with what has arrived, part by part."}
      actions={allowed(me, kind === "sale" ? "sales" : "purchase", "create") && <Link href={`/owner/orders/new?kind=${kind}`} className="btn btn-filled"><Plus size={18} />New</Link>}>
      <Filters current={status} items={["open", "closed", "all"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), href: `/owner/orders?kind=${kind}&status=${k}` }))} />
      {!rows.length ? <Empty icon={FileText} title={`No ${status === "all" ? "" : status + " "}${label.toLowerCase()}`} /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[760px]"><thead><tr><th>Order</th><th>{kind === "sale" ? "Customer" : "Supplier"}</th><th>Material</th><th className="w-48">{kind === "sale" ? "Dispatched" : "Received"}</th><th className="num">Billed</th><th className="num">Value</th><th></th></tr></thead><tbody>
          {rows.map((o) => <tr key={o.id}><td><Link href={`/owner/orders/${o.id}`} className="font-medium text-pri hover:underline">{o.number}</Link><div className="text-xs text-ink2">{sdate(o.date)}</div></td><td>{o.party.name}</td><td>{o.material.name}</td><td><Bar pct={o.pct} tone={o.over ? "err" : "pri"} /><div className="mt-1 text-xs text-ink2">{num(o.received)} / {num(o.qty)} {o.material.unit}</div></td><td className="num">{num(o.billed)}</td><td className="num">{inr(o.value)}</td><td>{o.over > 0 ? <Chip tone="red">{num(o.over)} over</Chip> : o.status === "closed" ? <Chip>Closed</Chip> : o.unbilled > 0 ? <Chip tone="amber">{num(o.unbilled)} to bill</Chip> : null}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
