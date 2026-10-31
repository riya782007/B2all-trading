import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { orderViews } from "@/lib/domain";
import { Denied, Page } from "@/components/ui";
import DeliveryForm from "./form";
export default async function NewDelivery({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  if (!(await staff("inventory", "create"))) return <Denied />;
  const { order } = await searchParams;
  const open = (await orderViews(await getStore())).filter((o) => o.status === "open").map((o) => ({ id: o.id, label: `${o.number} · ${o.party.name} · ${o.material.name}`, kind: o.kind, unit: o.material.unit, qty: o.qty, received: o.received, rate: o.rate }));
  return <Page title="Record a dispatch or receipt" sub="Pick the order and type what is on the bill. The balance updates as you type." back={{ href: "/owner/deliveries", label: "Dispatch and receipts" }}><div className="max-w-2xl"><DeliveryForm orders={open} initial={order} /></div></Page>;
}
