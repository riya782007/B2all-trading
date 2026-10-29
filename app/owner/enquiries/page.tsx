import EnquiryRow from "@/components/EnquiryRow";
import { allEnquiries } from "@/lib/store";
import { STATUS_LABEL, type Status } from "@/lib/types";

export default async function Enquiries() {
  const all = await allEnquiries();
  const order: Status[] = ["new", "quoted", "confirmed", "dispatched", "closed"];
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-brand">Enquiries</h1>
      {order.map((s) => {
        const rows = all.filter((e) => e.status === s);
        if (!rows.length) return null;
        return (<section key={s} className="mt-8"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{STATUS_LABEL[s]} · {rows.length}</h2><div className="space-y-3">{rows.map((e) => <EnquiryRow key={e.id} e={e} />)}</div></section>);
      })}
    </>
  );
}
