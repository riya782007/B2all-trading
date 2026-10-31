import Link from "next/link";
import { Route } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { EWAY_LIMIT, orderViews } from "@/lib/domain";
import { ewayStatus, maxValidityDays } from "@/lib/eway";
import { num, sdate } from "@/lib/money";
import { Chip, Denied, Empty, Notice, Page } from "@/components/ui";

export default async function Eway({ searchParams }: { searchParams: Promise<{ km?: string; odc?: string }> }) {
  if (!(await staff("inventory"))) return <Denied />;
  const { km = "", odc } = await searchParams;
  const rows = (await orderViews(await getStore())).flatMap((o) => o.deliveries.map((d) => ({ d, o })));
  const withEwb = rows.filter((r) => r.d.eway_no).sort((a, b) => (b.d.eway_valid_till ?? "").localeCompare(a.d.eway_valid_till ?? ""));
  const missing = rows.filter((r) => !r.d.eway_no && Number(r.d.qty) * r.o.rate > EWAY_LIMIT);
  const days = maxValidityDays(Number(km), !!odc);
  return (
    <Page title="E-way bills" sub="Every e-way bill beside its truck, bill and order.">
      {missing.length > 0 && <Notice tone="amber">{missing.length} movement{missing.length > 1 ? "s" : ""} above ₹50,000 have no e-way bill number: {missing.map((m) => m.d.bill_no).join(", ")}</Notice>}
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-5"><div className="mr-auto"><div className="font-medium">How long can it last?</div><div className="text-sm text-ink2">1 day per 200 km, or per 20 km for over-dimensional cargo.</div></div><label className="field"><span>Distance (km)</span><input name="km" inputMode="numeric" defaultValue={km} className="input w-32" /></label><label className="flex h-12 items-center gap-2 text-sm"><input type="checkbox" name="odc" defaultChecked={!!odc} className="size-5" />Over-dimensional</label><button className="btn btn-tonal">Check</button>{days > 0 && <div className="w-full rounded-2xl bg-pri-c px-4 py-3 text-on-pri-c">Up to <b>{days} day{days > 1 ? "s" : ""}</b>. Extension is allowed only within 8 hours before or after expiry. Confirm on the official portal.</div>}</form>
      {!withEwb.length ? <Empty icon={Route} title="No e-way bills recorded" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[720px]"><thead><tr><th>E-way bill</th><th>Status</th><th>Valid till</th><th>Vehicle</th><th>Bill</th><th>Order</th><th className="num">Qty</th></tr></thead><tbody>
          {withEwb.map(({ d, o }) => { const st = ewayStatus(d.eway_valid_till); return <tr key={d.id}><td className="font-medium">{d.eway_no}</td><td><Chip tone={st.tone}>{st.label}</Chip></td><td>{sdate(d.eway_valid_till)}</td><td>{d.vehicle_no}</td><td>{d.bill_no}</td><td><Link href={`/owner/orders/${o.id}`} className="text-pri hover:underline">{o.number}</Link></td><td className="num">{num(d.qty)}</td></tr>; })}
        </tbody></table></div>)}
      <p className="mt-4 text-sm text-ink2">Generating, extending and updating Part B straight from here needs the government e-way bill API through a GST suvidha provider.</p>
    </Page>
  );
}
