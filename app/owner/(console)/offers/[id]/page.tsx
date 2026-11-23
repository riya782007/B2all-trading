import { notFound } from "next/navigation";
import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { personas } from "@/lib/crm";
import { company } from "@/lib/domain";
import { personalise } from "@/lib/links";
import { fdate } from "@/lib/money";
import { Denied, Notice, Page } from "@/components/ui";
import Queue from "./queue";

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; mailed?: string }> }) {
  if (!(await staff("crm", "create"))) return <Denied />;
  const [{ id }, sp] = await Promise.all([params, searchParams]); const s = await getStore();
  const o = await s.one("offers", id); if (!o) notFound();
  const [sends, people, mats, co, enq, parties] = await Promise.all([s.all("offer_sends", { offer_id: id }), personas(s), s.all("materials"), company(s), s.all("enquiries"), s.all("parties", { type: "customer" })]);
  const mat = mats.find((m) => m.id === o.material_id)?.name ?? "";
  const channel = (o.channel || sends[0]?.channel || "whatsapp") as "whatsapp" | "email" | "sms" | "website";
  const sig = `\n\n— ${co.name || "B2All Commo"}${co.phone ? `\n${co.phone}` : ""}`;
  const rows = sends.map((x) => people.find((p) => p.id === x.party_id)).filter(Boolean).map((p) => {
    const v = { name: p!.name, company: p!.name, city: p!.city || "your city", material: mat || p!.topMaterial || "your material" };
    const text = `${personalise(o.title, v)}\n\n${personalise(o.body, v)}${o.discount ? `\nOffer: ${o.discount}` : ""}${o.code ? `\nCode: ${o.code}` : ""}${o.valid_till ? `\nValid till ${fdate(o.valid_till)}` : ""}${sig}`;
    return { id: p!.id, name: p!.name, city: p!.city, phone: p!.whatsapp, email: p!.email, subject: personalise(o.title, v), text };
  });
  const prof = new Set(sends.map((x) => parties.find((p) => p.id === x.party_id)?.profile_id).filter(Boolean));
  const replies = enq.filter((e) => e.created_at >= o.created_at && prof.has(e.customer_id)).length;
  const used = enq.filter((e) => e.offer_id === o.id).length;
  return (
    <Page title={o.title} sub={`Prepared ${fdate(o.created_at)} for ${rows.length} customers by ${channel}${replies ? ` · ${replies} enquiries since` : ""}${used ? ` · ${used} enquiries used this offer` : ""}`} back={{ href: "/owner/offers", label: "Offers" }}>
      {sp.new && <Notice>{channel === "email" && Number(sp.mailed) > 0 ? `${sp.mailed} emails sent from your company Gmail.` : channel === "whatsapp" ? "Ready. Press “Send next” and WhatsApp opens with the personal message typed. Tap send there, come back, press again." : "Ready to send."}</Notice>}
      {channel === "website" ? <Notice>Live on the website{o.valid_till ? ` until ${fdate(o.valid_till)}` : ""}: on the homepage under “Current offers” and in every customer&apos;s account.</Notice> : <Queue rows={rows} channel={channel as "whatsapp" | "email" | "sms"} title={o.title} />}
    </Page>
  );
}
