import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { fdate } from "@/lib/money";
import SignForm from "./sign-form";
export const metadata = { title: "Contract" };
export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe(); if (!me) redirect("/login");
  const { id } = await params; const s = await getStore();
  const c = await s.one("contracts", id); const party = c && (await s.one("parties", c.party_id));
  if (!c || !party || (party.profile_id !== me.profile.id && me.profile.role === "customer") || c.status === "draft") notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account?tab=documents" className="inline-flex items-center gap-1 text-sm font-semibold text-ink2 hover:text-ink">Back to documents</Link>
      <h1 className="mt-2 text-[2rem] font-semibold">Contract {c.number}</h1>
      <article className="card mt-4 whitespace-pre-wrap p-6 font-[450] leading-relaxed sm:p-8">{c.body}</article>
      {c.status === "signed" ? (
        <div className="mt-4 rounded-[14px] bg-ok-c p-5 text-on-ok-c"><div className="font-medium">Signed by {c.signed_name} on {fdate(c.signed_at)}</div><div className="mt-1 break-all text-xs opacity-80">Document fingerprint (SHA-256): {c.doc_hash}</div></div>
      ) : c.status === "sent" ? <SignForm id={c.id} name={me.profile.name} /> : <p className="mt-4 text-ink2">This contract was withdrawn.</p>}
    </div>
  );
}
