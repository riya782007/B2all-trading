import Link from "next/link";
import { Download, Boxes } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { stock } from "@/lib/domain";
import { inr, num } from "@/lib/money";
import { Chip, Denied, Empty, Page, Stat } from "@/components/ui";

export default async function Stock() {
  const me = await staff("inventory"); if (!me) return <Denied />;
  const rows = await stock(await getStore());
  return (
    <Page title="Stock" sub="Built from every receipt and dispatch, so nothing is typed twice." actions={allowed(me, "inventory", "export") && <Link href="/owner/export/stock" className="btn btn-outline"><Download size={18} />Excel</Link>}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3"><Stat label="Stock value" value={inr(rows.reduce((t, r) => t + r.value, 0))} hint="at average purchase rate" tone="pri" /><Stat label="Arriving" value={`${num(rows.reduce((t, r) => t + r.pendIn, 0))} MT`} hint="on open purchase orders" /><Stat label="Still to send" value={`${num(rows.reduce((t, r) => t + r.pendOut, 0))} MT`} hint="on open sales orders" tone="ter" /></div>
      {!rows.length ? <Empty icon={Boxes} title="No materials" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[860px]"><thead><tr><th>Material</th><th className="num">Opening</th><th className="num">In</th><th className="num">Out</th><th className="num">In hand</th><th className="num">Arriving</th><th className="num">To send</th><th className="num">If all happen</th><th className="num">Value</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td className="font-medium">{r.name}</td><td className="num">{num(r.opening_qty)}</td><td className="num text-pri">+{num(r.inQty)}</td><td className="num">−{num(r.outQty)}</td><td className={`num font-semibold ${r.closing < 0 ? "text-err" : ""}`}>{num(r.closing)} {r.unit}</td><td className="num">{num(r.pendIn)}</td><td className="num">{num(r.pendOut)}</td><td className="num">{r.projected < 0 ? <Chip tone="red">{num(r.projected)} short</Chip> : num(r.projected)}</td><td className="num">{inr(r.value)}</td></tr>)}
        </tbody></table></div>)}
    </Page>
  );
}
