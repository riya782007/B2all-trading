"use client";
import { useActionState } from "react";
import { ownerLogin, type OwnerState } from "../../actions";

export default function OwnerForm({ demo }: { demo: boolean }) {
  const [s, act, pending] = useActionState<OwnerState, FormData>(ownerLogin, {});
  return (
    <form action={act} className="mt-6 space-y-3">
      {demo ? <p className="rounded-xl bg-soft p-3 text-sm text-muted">Demo mode: no password needed.</p> : (<>
        <input name="email" type="email" placeholder="Email" autoComplete="username" required className="input" />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password" required className="input" />
      </>)}
      {s.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "One moment…" : demo ? "Enter console" : "Sign in"}</button>
    </form>
  );
}
