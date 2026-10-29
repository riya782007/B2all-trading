import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import StatusPill from "@/components/StatusPill";
import { logout } from "../actions";
import { getUser, myEnquiries, recommendations } from "@/lib/store";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function Account() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const [enq, recs] = await Promise.all([myEnquiries(user.id), recommendations(user.id)]);
  const open = enq.filter((e) => e.status !== "closed");
  const onTheWay = enq.filter((e) => e.status === "dispatched");
  const past = enq.filter((e) => e.status === "closed");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold text-brand">Hello, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">{[user.company, user.city].filter(Boolean).join(" · ")}</p>

        {onTheWay.length > 0 && (
          <div className="card mt-6 border-brand2 bg-soft p-5">
            <div className="text-sm font-semibold text-brand2">On the way</div>
            {onTheWay.map((e) => <div key={e.id} className="mt-1 font-semibold">{e.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(", ")}</div>)}
          </div>
        )}

        <Section title="Your enquiries">
          {open.length ? open.map((e) => (
            <div key={e.id} className="card p-4">
              <div className="flex items-center justify-between"><span className="text-sm text-muted">{fmt(e.createdAt)}</span><StatusPill s={e.status} /></div>
              <ul className="mt-2 space-y-0.5">{e.items.map((i) => <li key={i.materialId}><b>{i.qty} {i.unit}</b> {i.name}</li>)}</ul>
            </div>
          )) : <Empty>No open enquiries. <Link href="/#materials" className="font-semibold text-brand2 underline">Start one</Link></Empty>}
        </Section>

        {recs.length > 0 && (
          <Section title="You may also need">
            <div className="grid gap-3 sm:grid-cols-3">{recs.map((m) => <Link key={m.id} href="/#materials" className="card p-4 hover:border-brand2"><div className="font-semibold">{m.name}</div><div className="text-sm text-muted">{m.category}</div></Link>)}</div>
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Past orders · order again">
            {past.map((e) => <div key={e.id} className="card p-4 text-sm"><span className="text-muted">{fmt(e.createdAt)} · </span>{e.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(", ")}</div>)}
          </Section>
        )}

        <form action={logout} className="mt-10"><button className="btn btn-ghost">Sign out</button></form>
      </main>
    </>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2><div className="space-y-3">{children}</div></section>
);
const Empty = ({ children }: { children: React.ReactNode }) => <div className="card p-5 text-muted">{children}</div>;
