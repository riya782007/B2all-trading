"use client";
import { useActionState } from "react";
import { customerLogin, type FormState } from "@/app/actions";
export default function LoginForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState<FormState, FormData>(customerLogin, {});
  const v = s.values ?? {};
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="field"><span>Your name</span><input name="name" autoComplete="name" defaultValue={v.name} required className="input" /></label>
      <label className="field"><span>Mobile number</span><input name="phone" inputMode="tel" autoComplete="tel-national" defaultValue={v.phone} required className="input" placeholder="98100 00000" /></label>
      <label className="field"><span>City</span><input name="city" autoComplete="address-level2" defaultValue={v.city} required className="input" /></label>
      {s.error && <p role="alert" className="text-sm font-medium text-err">{s.error}</p>}
      <button className="btn btn-filled btn-lg w-full" disabled={pending}>{pending ? "One moment…" : "Continue"}</button>
      <p className="text-xs text-ink2">By continuing you agree that B2All may contact you about your enquiries on WhatsApp.</p>
    </form>
  );
}
