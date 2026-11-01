import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { company, invoiceViews } from "@/lib/domain";
import InvoiceDoc from "@/components/InvoiceDoc";
import PrintButton from "@/components/PrintButton";
export default async function CustomerInvoice({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe(); if (!me) redirect("/login");
  const { id } = await params; const s = await getStore();
  const inv = (await invoiceViews(s, "sale")).find((i) => i.id === id);
  if (!inv || (inv.party.profile_id !== me.profile.id && me.profile.role === "customer")) notFound();
  const dels = (await s.all("deliveries")).filter((d) => inv.delivery_ids.includes(d.id));
  return (<div className="mx-auto max-w-3xl px-4 py-8"><div className="noprint mb-4 flex justify-between"><Link href="/account?tab=documents" className="inline-flex items-center gap-1 text-sm font-semibold text-ink2 hover:text-ink">Back to documents</Link><PrintButton /></div><InvoiceDoc inv={inv} co={await company(s)} vehicles={[...new Set(dels.map((d) => d.vehicle_no))]} /></div>);
}
