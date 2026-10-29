import { connection } from "next/server";
import StatusPill from "./StatusPill";
import { advanceEnquiry } from "@/app/actions";
import { NEXT_ACTION, type Enquiry } from "@/lib/types";
import { wa } from "@/lib/links";

const ago = (d: string) => { const h = (Date.now() - +new Date(d)) / 36e5; return h < 1 ? "just now" : h < 24 ? `${Math.floor(h)}h ago` : `${Math.floor(h / 24)}d ago`; };

export default async function EnquiryRow({ e }: { e: Enquiry }) {
  await connection();
  const summary = e.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(", ");
  const hello = `Hello ${e.customerName.split(" ")[0]}, regarding your enquiry for ${summary}: `;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-semibold">{e.customerName}</div><div className="text-sm text-muted">{e.city} · {ago(e.createdAt)}</div></div>
        <StatusPill s={e.status} />
      </div>
      <p className="mt-2">{summary}</p>
      {e.note && <p className="mt-1 text-sm text-muted">“{e.note}”</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={wa(e.customerPhone, hello)} target="_blank" rel="noreferrer" className="btn btn-ghost !min-h-11 !py-2">WhatsApp</a>
        {NEXT_ACTION[e.status] && (
          <form action={advanceEnquiry.bind(null, e.id, e.status)}><button className="btn btn-primary !min-h-11 !py-2">{NEXT_ACTION[e.status]}</button></form>
        )}
      </div>
    </div>
  );
}
