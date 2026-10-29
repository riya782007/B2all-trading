"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

export default function LoginForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState<LoginState, FormData>(loginAction, { next });
  return (
    <form action={act} className="mt-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <input name="name" placeholder="Your name" autoComplete="name" defaultValue={s.name} required className="input" />
      <input name="phone" placeholder="Mobile number" inputMode="tel" autoComplete="tel-national" defaultValue={s.phone} required className="input" />
      <input name="city" placeholder="City" autoComplete="address-level2" defaultValue={s.city} required className="input" />
      {s.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "One moment…" : "Continue"}</button>
      <p className="text-xs text-muted">By continuing you agree that B2All may contact you about your enquiries on WhatsApp.</p>
    </form>
  );
}
