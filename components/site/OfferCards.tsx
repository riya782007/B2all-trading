import Link from "next/link";
import { BadgePercent } from "lucide-react";
import type { LiveOffer } from "@/lib/offers";
const d = (x: string) => new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
/** Offer cards for the website. "Use this offer" puts the material in the enquiry with the offer attached. */
export default function OfferCards({ offers }: { offers: LiveOffer[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{offers.map((o) => (
    <div key={o.id} className="card flex flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pri"><BadgePercent size={16} />{o.forYou ? "Made for you" : "Offer"}{o.valid_till && <span className="ml-auto normal-case tracking-normal text-ink2">till {d(o.valid_till)}</span>}</div>
      <div className="mt-2 text-lg font-medium">{o.title}</div>
      <p className="mt-1 flex-1 text-sm text-ink2">{o.body}</p>
      {(o.discount || o.code) && <div className="mt-3 flex flex-wrap gap-2 text-sm">{o.discount && <span className="chip chip-green">{o.discount}</span>}{o.code && <span className="rounded-md border border-dashed border-pri px-2 py-0.5 font-mono text-xs font-semibold text-pri">{o.code}</span>}</div>}
      <Link href={`/basket?offer=${o.id}${o.material_id ? `&add=${o.material_id}` : ""}`} className="btn btn-tonal mt-4">Use this offer</Link>
    </div>))}</div>;
}
