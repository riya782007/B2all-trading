import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { orderViews } from "@/lib/domain";
import { Denied, Page } from "@/components/ui";
import InvoiceForm from "./form";
export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ kind?: string; order?: string }> }) {
  const sp = await searchParams; const kind = sp.kind === "purchase" ? "purchase" : "sale";
  if (!(await staff(kind === "sale" ? "sales" : "purchase", "create"))) return <Denied />;
  const orders = (await orderViews(await getStore(), kind)).filter((o) => o.deliveries.some((d) => !d.invoice_id)).map((o) => ({ id: o.id, label: `${o.number} · ${o.party.name} · ${o.material.name}`, rate: o.rate, unit: o.material.unit, gst: Number(o.material.gst_rate), ordered: o.qty, billed: o.billed, dels: o.deliveries.filter((d) => !d.invoice_id).map((d) => ({ id: d.id, label: `${d.bill_no} · ${d.vehicle_no} · ${d.bill_date}`, qty: Number(d.qty) })) }));
  return <Page title={kind === "sale" ? "Raise a GST invoice" : "Enter a supplier bill"} sub={kind === "sale" ? "Tick the dispatches to bill. GST, place of supply and accounts are handled for you." : "Tick the receipts this bill covers. We check the quantity against what arrived and the PO."} back={{ href: `/owner/invoices?kind=${kind}`, label: kind === "sale" ? "Invoices" : "Supplier bills" }}><div className="max-w-2xl"><InvoiceForm kind={kind} orders={orders} initial={sp.order} /></div></Page>;
}
