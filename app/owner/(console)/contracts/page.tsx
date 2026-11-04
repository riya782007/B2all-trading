import Link from "next/link";
import { FileSignature } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { sdate } from "@/lib/money";
import { Chip, Denied, Empty, Page, Filters } from "@/components/ui";
const T = { draft: ["blue", "Draft"], sent: ["amber", "Awaiting signature"], signed: ["green", "Signed"], cancelled: ["grey", "Withdrawn"] } as const;
export default async function Contracts({ searchParams }: { searchParams: Promise<{status?:string;q?:string}> }) {
  const {status="all",q=""}=await searchParams;
  if (!(await staff("sales"))) return <Denied />;
  const s = await getStore();
  const [cs, parties, orders] = await Promise.all([s.all("contracts"), s.all("parties"), s.all("orders")]);
  const rows = cs.filter(c=>(status==="all"||c.status===status)&&`${c.number} ${parties.find(p=>p.id===c.party_id)?.name||""} ${orders.find(o=>o.id===c.order_id)?.number||""}`.toLowerCase().includes(q.toLowerCase().trim())).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <Page title="Contracts" sub="Prepare from a sales order. Follow each agreement from draft to customer acknowledgement." actions={<Link href="/owner/orders?kind=sale" className="btn btn-filled">Prepare from an order</Link>}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3"><Filters current={status} items={[{key:"all",label:`All contracts (${cs.length})`},...Object.entries(T).map(([key,[,label]])=>({key,label:`${label} (${cs.filter(c=>c.status===key).length})`}))].map(i=>({...i,href:`/owner/contracts?status=${i.key}&q=${encodeURIComponent(q)}`}))}/><form action="/owner/contracts" className="mb-4 flex gap-2"><input type="hidden" name="status" value={status}/><input className="input !h-9 !text-xs" name="q" defaultValue={q} placeholder="Customer, order or contract" aria-label="Search contracts"/><button className="btn btn-outline btn-sm">Search</button></form></div>
      {!rows.length ? <Empty icon={FileSignature} title={cs.length?"No matching contracts":"No contracts yet"}>{cs.length?<Link href="/owner/contracts" className="text-pri underline">Clear filters</Link>:<>Open a sales order and choose &ldquo;Prepare contract&rdquo;.</>}</Empty> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[640px]"><thead><tr><th>Contract</th><th>Customer</th><th>Order</th><th>Created</th><th>Status</th></tr></thead><tbody>
          {rows.map((c) => <tr key={c.id}><td><Link href={`/owner/contracts/${c.id}`} className="font-medium text-pri hover:underline">{c.number}</Link></td><td>{parties.find((p) => p.id === c.party_id)?.name}</td><td>{orders.find((o) => o.id === c.order_id)?.number}</td><td>{sdate(c.created_at)}</td><td><Chip tone={T[c.status][0]}>{T[c.status][1]}{c.status === "signed" && c.signed_at ? ` · ${sdate(c.signed_at)}` : ""}</Chip></td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
