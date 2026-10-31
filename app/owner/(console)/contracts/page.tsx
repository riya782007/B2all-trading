import Link from "next/link";
import { FileSignature } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { sdate } from "@/lib/money";
import { Chip, Denied, Empty, Page } from "@/components/ui";
const T = { draft: ["blue", "Draft"], sent: ["amber", "Awaiting signature"], signed: ["green", "Signed"], cancelled: ["grey", "Withdrawn"] } as const;
export default async function Contracts() {
  if (!(await staff("sales"))) return <Denied />;
  const s = await getStore();
  const [cs, parties, orders] = await Promise.all([s.all("contracts"), s.all("parties"), s.all("orders")]);
  const rows = cs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <Page title="Contracts" sub="Drafted from the order in one tap. Customers sign on their B2All page; time, name, IP and a document fingerprint are kept.">
      {!rows.length ? <Empty icon={FileSignature} title="No contracts yet">Open a sales order and choose "Prepare contract".</Empty> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[640px]"><thead><tr><th>Contract</th><th>Customer</th><th>Order</th><th>Created</th><th>Status</th></tr></thead><tbody>
          {rows.map((c) => <tr key={c.id}><td><Link href={`/owner/contracts/${c.id}`} className="font-medium text-pri hover:underline">{c.number}</Link></td><td>{parties.find((p) => p.id === c.party_id)?.name}</td><td>{orders.find((o) => o.id === c.order_id)?.number}</td><td>{sdate(c.created_at)}</td><td><Chip tone={T[c.status][0]}>{T[c.status][1]}{c.status === "signed" && c.signed_at ? ` · ${sdate(c.signed_at)}` : ""}</Chip></td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
