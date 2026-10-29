import Composer from "./composer";
import { listCustomers, listOffers, offerRecipients } from "@/lib/store";
import { mail, sms, wa } from "@/lib/links";

export default async function Offers({ searchParams }: { searchParams: Promise<{ sent?: string; channel?: string; error?: string }> }) {
  const { sent, channel, error } = await searchParams;
  const [customers, offers] = await Promise.all([listCustomers(), listOffers()]);
  const offer = sent ? offers.find((o) => o.id === sent) : null;
  const recipients = offer ? await offerRecipients(offer.id) : [];
  const text = offer ? `${offer.title}\n\n${offer.body}${offer.code ? `\nVoucher: ${offer.code}` : ""}${offer.validTill ? `\nValid till ${offer.validTill}` : ""}\n\n— B2All Commo` : "";
  const link = (c: { name: string; phone: string }) => channel === "sms" ? sms(c.phone, text) : channel === "email" ? mail("", offer!.title, text) : wa(c.phone, `Hello ${c.name.split(" ")[0]},\n\n${text}`);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-brand">Offers</h1>
      {offer ? (
        <div className="card mt-6 p-5">
          <div className="font-display text-xl font-semibold text-brand">Offer saved for {recipients.length} customers</div>
          <p className="mt-1 text-sm text-muted">Tap each name to open the message ready to send. Fully automatic sending to everyone at once switches on when the WhatsApp Business account is connected.</p>
          <div className="mt-4 space-y-2">{recipients.map((c) => <a key={c.id} href={link(c)} target="_blank" rel="noreferrer" className="btn btn-ghost w-full !justify-between">{c.name}<span className="text-brand2">Open →</span></a>)}</div>
        </div>
      ) : (<>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">Pick a message and at least one customer.</p>}
        <Composer customers={customers.map((c) => ({ id: c.id, name: c.name, city: c.city }))} />
      </>)}
      {offers.length > 0 && (<>
        <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">Sent before</h2>
        <div className="space-y-2">{offers.map((o) => <div key={o.id} className="card p-4"><div className="font-semibold">{o.title}</div><div className="text-sm text-muted">Sent to {o.sentCount} customers{o.code ? ` · code ${o.code}` : ""}</div></div>)}</div>
      </>)}
    </>
  );
}
