import { Megaphone } from "lucide-react";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { hasAI, hasGmail } from "@/lib/integrations";
import { mail, sms, wa } from "@/lib/links";
import { Denied, Empty, Notice, Page, Section } from "@/components/ui";
import Composer from "./composer";

export default async function Offers({ searchParams }: { searchParams: Promise<{ sent?: string; channel?: string; mailed?: string; error?: string }> }) {
  if (!(await staff("crm", "create"))) return <Denied />;
  const sp = await searchParams; const s = await getStore();
  const [parties, offers, sends] = await Promise.all([s.all("parties", { type: "customer" }), s.all("offers"), s.all("offer_sends")]);
  const offer = sp.sent ? offers.find((o) => o.id === sp.sent) : null;
  const rec = offer ? sends.filter((x) => x.offer_id === offer.id).map((x) => parties.find((p) => p.id === x.party_id)!).filter(Boolean) : [];
  const text = offer ? `${offer.title}\n\n${offer.body}${offer.code ? `\nCode: ${offer.code}` : ""}${offer.valid_till ? `\nValid till ${offer.valid_till}` : ""}\n\n— B2All Commo` : "";
  return (
    <Page title="Offers" sub="Write once, send to everyone or a chosen few.">
      {sp.error && <Notice tone="red">Write a message and pick at least one customer.</Notice>}
      {offer ? (<>
        <Notice>{sp.channel === "email" && Number(sp.mailed) > 0 ? `${sp.mailed} emails sent from your Gmail.` : `Offer saved for ${rec.length} customers. Tap each to send it from your phone.`}{sp.channel === "whatsapp" && " Fully automatic WhatsApp sending needs the WhatsApp Business API."}</Notice>
        <div className="card divide-y divide-line">{rec.map((p) => { const href = sp.channel === "sms" ? sms(p.phone ?? "", text) : sp.channel === "email" ? mail(p.email ?? "", offer.title, text) : wa(p.phone ?? "", `Hello ${p.name},\n\n${text}`); return <a key={p.id} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between px-5 py-4 hover:bg-s2"><span className="font-medium">{p.name}</span><span className="text-sm font-semibold text-pri">Open</span></a>; })}</div>
      </>) : <Composer customers={parties.map((p) => ({ id: p.id, name: p.name, city: p.city ?? "", hasEmail: !!p.email, hasPhone: !!p.phone }))} ai={hasAI} gmail={hasGmail} />}
      <Section title="Sent before">{offers.length ? <div className="card divide-y divide-line">{offers.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((o) => <div key={o.id} className="px-5 py-3"><div className="font-medium">{o.title}</div><div className="text-sm text-ink2">Sent to {sends.filter((x) => x.offer_id === o.id).length} customers{o.code ? ` · code ${o.code}` : ""}</div></div>)}</div> : <Empty icon={Megaphone} title="No offers yet" />}</Section>
    </Page>
  );
}
