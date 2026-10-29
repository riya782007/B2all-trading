import { STATUS_LABEL, type Status } from "@/lib/types";
const tone: Record<Status, string> = {
  new: "bg-accent/15 text-accent", quoted: "bg-brand2/15 text-brand2", confirmed: "bg-brand2/25 text-brand",
  dispatched: "bg-brand/15 text-brand", closed: "bg-line text-muted",
};
export default function StatusPill({ s }: { s: Status }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone[s]}`}>{STATUS_LABEL[s]}</span>;
}
