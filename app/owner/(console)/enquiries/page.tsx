import { Inbox, MessageCircle } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { personas } from "@/lib/crm";
import { personalise } from "@/lib/links";
import { num, sdate } from "@/lib/money";
import { wa } from "@/lib/links";
import { Chip, Denied, Empty, Filters, Page } from "@/components/ui";
import { setEnquiryStatus } from "@/app/actions";
import Convert from "./convert";

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const me = await staff("crm"); if (!me) return <Denied />;
  const { status = "new" } = await searchParams; const s = await getStore();
  const [enq, items, mats, profiles, offers, people, parties] = await Promise.all([s.all("enquiries"), s.all("enquiry_items"), s.all("materials"), s.all("profiles"), s.all("offers"), personas(s), s.all("parties", { type: "customer" })]);
  const rows = enq.filter((e) => status === "all" || e.status === status).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const canSell = allowed(me, "sales", "create");
  return (
    <Page title="Enquiries" sub="Requests from the website. Turn one into a sales order and contract in a single step.">
      <Filters current={status} items={[["new", "New"], ["quoted", "Quoted"], ["won", "Won"], ["lost", "Lost"], ["all", "All"]].map(([k, l]) => ({ key: k, label: `${l}${k !== "all" ? ` · ${enq.filter((e) => e.status === k).length}` : ""}`, href: `/owner/enquiries?status=${k}` }))} />
      {!rows.length ? <Empty icon={Inbox} title="No enquiries here" /> : <div className="space-y-3">{rows.map((e) => {
        const c = profiles.find((p) => p.id === e.customer_id); const its = items.filter((i) => i.enquiry_id === e.id);
        const summary = its.map((i) => `${num(i.qty)} ${i.unit} ${mats.find((m) => m.id === i.material_id)?.name}`).join(", ");
        return (
          <div key={e.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="display text-lg font-medium">{c?.company || c?.name}</div><div className="text-sm text-ink2">{c?.name} · {c?.city} · {c?.phone} · {sdate(e.created_at)}</div></div><Chip tone={e.status === "new" ? "amber" : e.status === "won" ? "green" : e.status === "quoted" ? "blue" : "grey"}>{e.status}</Chip></div>
            <p className="mt-3 text-lg">{summary}</p>{e.note && <p className="mt-1 text-sm text-ink2">“{e.note}”</p>}
            {(() => { const o = offers.find((x) => x.id === e.offer_id); const pid = parties.find((p) => p.profile_id === e.customer_id)?.id; const pe = people.find((x) => x.id === pid); return <>
              {o && <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-ok-c px-3 py-1 text-sm text-on-ok-c">Came from offer <b>{personalise(o.title, { name: c?.company || c?.name || "", company: c?.company || "", city: c?.city || "", material: mats.find((m) => m.id === o.material_id)?.name || "their material" })}</b>{o.discount ? ` · ${o.discount}` : ""}{o.code ? ` · code ${o.code}` : ""}</p>}
              {pe && <p className="mt-2 text-xs text-ink2">{pe.segment} · {pe.orders} orders{pe.topMaterial ? ` · usually ${pe.topMaterial}` : ""}{pe.outstanding > 0 ? ` · ₹${pe.outstanding.toLocaleString("en-IN")} due` : ""}{pe.tags.length ? ` · ${pe.tags.join(", ")}` : ""} · <a className="text-pri underline" href={`/owner/parties/${pe.id}`}>profile</a></p>}
            </>; })()}
            <div className="mt-4 flex flex-wrap gap-2">
              {c?.phone && <a className="btn btn-outline" target="_blank" rel="noreferrer" href={wa(c.phone, `Hello ${c.name.split(" ")[0]}, thank you for your enquiry for ${summary}. `)}><MessageCircle size={18} />WhatsApp</a>}
              {e.status === "new" && allowed(me, "crm", "edit") && <form action={setEnquiryStatus.bind(null, e.id, "quoted")}><button className="btn btn-outline">Mark quoted</button></form>}
              {(e.status === "new" || e.status === "quoted") && allowed(me, "crm", "edit") && <form action={setEnquiryStatus.bind(null, e.id, "lost")}><button className="btn btn-text">Lost</button></form>}
            </div>
            {(e.status === "new" || e.status === "quoted") && canSell && <Convert id={e.id} items={its.map((i) => ({ id: i.id, qty: Number(i.qty), unit: i.unit, name: mats.find((m) => m.id === i.material_id)?.name ?? "" }))} />}
          </div>);
      })}</div>}
    </Page>
  );
}
