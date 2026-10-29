import Link from "next/link";
import { connection } from "next/server";
import EnquiryRow from "@/components/EnquiryRow";
import { allEnquiries, getUser, listCustomers } from "@/lib/store";

export default async function Today() {
  await connection();
  const [me, enq, customers] = await Promise.all([getUser(), allEnquiries(), listCustomers()]);
  const isNew = enq.filter((e) => e.status === "new");
  const quoted = enq.filter((e) => e.status === "quoted");
  const moving = enq.filter((e) => e.status === "confirmed" || e.status === "dispatched");
  const weekAgo = Date.now() - 7 * 864e5;
  const newCust = customers.filter((c) => +new Date(c.createdAt) > weekAgo).length;
  const tiles = [["Waiting for your quote", isNew.length, "text-accent"], ["Quoted, awaiting reply", quoted.length, "text-brand2"], ["Confirmed or moving", moving.length, "text-brand"], ["New customers this week", newCust, "text-brand"]] as const;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-brand">Good day, {me?.name.split(" ")[0]}</h1>
      <p className="mt-1 text-muted">{isNew.length ? (isNew.length === 1 ? "1 enquiry is waiting for you." : `${isNew.length} enquiries are waiting for you.`) : "You are all caught up."}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([l, n, c]) => <div key={l} className="card p-4"><div className={`font-display text-4xl font-semibold ${c}`}>{n}</div><div className="mt-1 text-sm text-muted">{l}</div></div>)}
      </div>
      <Link href="/owner/offers" className="btn btn-primary mt-5 w-full sm:w-auto">Send an offer to customers</Link>
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Needs you now</h2>
      <div className="space-y-3">
        {isNew.length ? isNew.map((e) => <EnquiryRow key={e.id} e={e} />) : <div className="card p-5 text-muted">Nothing is waiting. </div>}
      </div>
      {quoted.length > 0 && (<>
        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Follow up</h2>
        <div className="space-y-3">{quoted.map((e) => <EnquiryRow key={e.id} e={e} />)}</div>
      </>)}
    </>
  );
}
