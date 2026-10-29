import { listCustomers } from "@/lib/store";
import { wa } from "@/lib/links";

export default async function Customers() {
  const rows = await listCustomers();
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-brand">Customers</h1>
      <p className="mt-1 text-muted">{rows.length} people have signed in. Everyone who enquires is saved here automatically.</p>
      <div className="mt-6 space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-muted">{[c.company, c.city].filter(Boolean).join(" · ")}</div>
              <div className="text-sm text-muted">{c.phone} · {c.enquiryCount} enquir{c.enquiryCount === 1 ? "y" : "ies"}</div>
            </div>
            <a href={wa(c.phone, `Hello ${c.name.split(" ")[0]}, `)} target="_blank" rel="noreferrer" className="btn btn-ghost !min-h-11 !py-2">WhatsApp</a>
          </div>
        ))}
      </div>
    </>
  );
}
