import { notFound } from "next/navigation";
import { Send, Save } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { fdate } from "@/lib/money";
import { hasGmail } from "@/lib/integrations";
import { wa } from "@/lib/links";
import PrintButton from "@/components/PrintButton";
import { Chip, Denied, Notice, Page } from "@/components/ui";
import { saveContractBody, sendContractAction } from "@/app/actions";

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const me = await staff("sales"); if (!me) return <Denied />;
  const { id } = await params; const { sent } = await searchParams; const s = await getStore();
  const c = await s.one("contracts", id); if (!c) notFound();
  const [p, o] = await Promise.all([s.one("parties", c.party_id), s.one("orders", c.order_id)]);
  const editable = c.status === "draft" && allowed(me, "sales", "edit");
  return (
    <Page title={`Contract ${c.number}`} sub={`${p?.name} · order ${o?.number}`} back={{ href: "/owner/contracts", label: "Contracts" }}
      actions={<><Chip tone={c.status === "signed" ? "green" : c.status === "sent" ? "amber" : "blue"}>{c.status === "signed" ? "Signed" : c.status === "sent" ? "Awaiting signature" : "Draft"}</Chip><PrintButton label="Print" /></>}>
      {sent && <Notice>{sent === "email" ? `Sent. ${p?.name} got an email with the signing link.` : `Ready to sign on ${p?.name}'s B2All page.${hasGmail ? "" : " Email sending switches on once Gmail is connected; use WhatsApp below for now."}`}</Notice>}
      {editable ? (
        <form action={saveContractBody.bind(null, c.id)} className="space-y-3"><textarea name="body" defaultValue={c.body} className="input min-h-[420px] font-mono text-sm leading-relaxed" aria-label="Contract text" /><div className="flex flex-wrap gap-2"><button className="btn btn-outline"><Save size={18} />Save changes</button></div></form>
      ) : <article className="card whitespace-pre-wrap p-6 leading-relaxed sm:p-8">{c.body}</article>}
      {c.status === "draft" && allowed(me, "sales", "edit") && <form action={sendContractAction.bind(null, c.id)} className="mt-4"><button className="btn btn-filled btn-lg"><Send size={18} />Send for e-signature</button></form>}
      {c.status === "sent" && p?.phone && <a className="btn btn-tonal mt-4" target="_blank" rel="noreferrer" href={wa(p.phone, `Dear ${p.name}, contract ${c.number} for order ${o?.number} is ready for your signature on your B2All page. Please sign in and open Documents.`)}>Remind on WhatsApp</a>}
      {c.status === "signed" && <div className="card-tonal mt-4 p-5 text-sm"><div className="font-medium">Signed by {c.signed_name} on {fdate(c.signed_at)}</div><div className="mt-1 text-ink2">IP {c.signed_ip ?? "-"}</div><div className="mt-1 break-all text-ink2">SHA-256 {c.doc_hash}</div></div>}
    </Page>
  );
}
