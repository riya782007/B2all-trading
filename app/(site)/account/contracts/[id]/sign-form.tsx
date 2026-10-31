"use client";
import { useActionState } from "react";
import { signContract, type FormState } from "@/app/actions";
export default function SignForm({ id, name }: { id: string; name: string }) {
  const [s, act, pending] = useActionState<FormState, FormData>(signContract.bind(null, id), {});
  if (s.ok) return <div className="mt-4 rounded-3xl bg-pri-c p-5 font-medium text-on-pri-c">Signed. Thank you. A copy stays here under Documents.</div>;
  return (
    <form action={act} className="card mt-4 space-y-4 p-6">
      <div className="display text-lg font-medium">Sign this contract</div>
      <label className="field"><span>Type your full name</span><input name="signer" defaultValue={name} required className="input font-[Georgia,serif] text-xl italic" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="agree" className="mt-0.5 size-5 accent-[var(--pri)]" /><span>I have read this contract and agree to its terms on behalf of my company. I understand my typed name, the time and my IP address are recorded as my electronic signature.</span></label>
      {s.error && <p role="alert" className="text-sm font-medium text-err">{s.error}</p>}
      <button className="btn btn-filled btn-lg w-full" disabled={pending}>{pending ? "Signing…" : "Sign contract"}</button>
    </form>
  );
}
