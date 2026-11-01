import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Mail, Wallet } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { company, invoiceViews } from "@/lib/domain";
import { inr } from "@/lib/money";
import { wa } from "@/lib/links";
import InvoiceDoc from "@/components/InvoiceDoc";
import PrintButton from "@/components/PrintButton";
import { Chip, Denied } from "@/components/ui";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const s = await getStore();
  const inv = (await invoiceViews(s)).find((i) => i.id === id); if (!inv) notFound();
  const me = await staff(inv.kind === "sale" ? "sales" : "purchase"); if (!me) return <Denied />;
  const dels = (await s.all("deliveries")).filter((d) => inv.delivery_ids.includes(d.id));
  const text = `Dear ${inv.party.name}, invoice ${inv.number} for ${inr(inv.total)} is ready. You can view and download it on your B2All page.`;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="noprint mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/owner/invoices?kind=${inv.kind}`} className="mr-auto text-sm font-semibold text-ink2 hover:text-ink">Back to {inv.kind === "sale" ? "invoices" : "supplier bills"}</Link>
        <Chip tone={inv.status === "paid" ? "green" : inv.overdue ? "red" : "amber"}>{inv.status === "paid" ? "Paid" : `Balance ${inr(inv.balance)}`}</Chip>
        {inv.balance > 0 && allowed(me, "accounts", "create") && <Link href={`/owner/accounts/new?type=${inv.kind === "sale" ? "receipt" : "payment"}&party=${inv.party_id}&invoice=${inv.id}&amount=${inv.balance}`} className="btn btn-tonal"><Wallet size={18} />{inv.kind === "sale" ? "Record payment" : "Pay"}</Link>}
        {inv.kind === "sale" && inv.party.phone && <a href={wa(inv.party.phone, text)} target="_blank" rel="noreferrer" className="btn btn-outline"><MessageCircle size={18} />WhatsApp</a>}
        {inv.kind === "sale" && inv.party.email && <a href={`mailto:${inv.party.email}?subject=${encodeURIComponent(`Invoice ${inv.number}`)}&body=${encodeURIComponent(text)}`} className="btn btn-outline"><Mail size={18} />Email</a>}
        <PrintButton />
      </div>
      <InvoiceDoc inv={inv} co={await company(s)} vehicles={[...new Set(dels.map((d) => d.vehicle_no))]} />
    </div>
  );
}
