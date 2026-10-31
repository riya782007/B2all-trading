import Link from "next/link";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { company } from "@/lib/domain";
import { Denied, Page } from "@/components/ui";
import OrderForm from "./form";

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ kind?: string; party?: string }> }) {
  const sp = await searchParams; const kind = sp.kind === "purchase" ? "purchase" : "sale";
  if (!(await staff(kind === "sale" ? "sales" : "purchase", "create"))) return <Denied />;
  const s = await getStore();
  const [parties, mats, co] = await Promise.all([s.all("parties", { type: kind === "sale" ? "customer" : "supplier" }), s.all("materials"), company(s)]);
  return (
    <Page title={kind === "sale" ? "New sales order" : "New purchase order"} back={{ href: `/owner/orders?kind=${kind}`, label: kind === "sale" ? "Sales orders" : "Purchase orders" }}>
      <div className="max-w-2xl">
        {!parties.length ? <p className="card-tonal p-5">Add a {kind === "sale" ? "customer" : "supplier"} first. <Link className="font-medium text-pri underline" href={`/owner/parties/new?type=${kind === "sale" ? "customer" : "supplier"}`}>Add now</Link></p> :
          <OrderForm kind={kind} parties={parties.map((p) => ({ id: p.id, name: p.name, state: p.state_code || co.state_code }))} materials={mats.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, unit: m.unit, gst: Number(m.gst_rate) }))} home={co.state_code} preset={sp.party} />}
      </div>
    </Page>
  );
}
