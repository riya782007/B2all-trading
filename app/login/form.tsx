"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

export default function LoginForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState<LoginState, FormData>(loginAction, { step: "details", next });
  if (s.step === "otp") {
    return (
      <form action={act} className="mt-6 space-y-3">
        <label className="block text-sm font-medium">Code sent to {s.phone}</label>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required className="input text-center text-2xl tracking-[0.4em]" />
        {s.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Checking…" : "Continue"}</button>
      </form>
    );
  }
  return (
    <form action={act} className="mt-6 space-y-3">
      <input name="name" placeholder="Your name" autoComplete="name" defaultValue={s.name} required className="input" />
      <input name="phone" placeholder="Mobile number" inputMode="tel" autoComplete="tel-national" required className="input" />
      <input name="city" placeholder="City" autoComplete="address-level2" defaultValue={s.city} required className="input" />
      {s.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send code"}</button>
      <p className="text-xs text-muted">By continuing you agree that B2All may contact you about your enquiries on WhatsApp.</p>
    </form>
  );
}
