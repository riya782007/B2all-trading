"use client";
import { useActionState, useState } from "react";
import { staffLogin, type FormState } from "@/app/actions";
export default function StaffForm({ demo }: { demo: { id: string; name: string; role: string }[] }) {
  const [s, act, pending] = useActionState<FormState, FormData>(staffLogin, {});
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  if (demo.length) return (
    <form action={act} className="space-y-3">
      <p className="text-sm text-ink2">Demo mode: pick a person to see their view.</p>
      {demo.map((d) => <button key={d.id} name="demo" value={d.id} className="btn btn-outline btn-lg w-full !justify-between" disabled={pending}><span>{d.name}</span><span className="text-xs font-semibold text-ink2">{d.role === "owner" ? "Owner" : "Staff"}</span></button>)}
    </form>
  );
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <label className="field"><span>Work email</span><input name="email" type="email" autoComplete="username" required className="input" /></label>
      <label className="field"><span>{mode === "signup" ? "Choose a password (8+ characters)" : "Password"}</span><input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required className="input" /></label>
      {s.error && <p role="alert" className="text-sm font-medium text-err">{s.error}</p>}
      {s.ok && <p role="status" className="text-sm font-medium text-pri">{s.ok}</p>}
      <button className="btn btn-filled btn-lg w-full" disabled={pending}>{pending ? "Signing in…" : mode === "signup" ? "Create my login" : "Sign in"}</button>
      <button type="button" className="btn btn-text w-full !text-ink2 hover:!text-ink" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "First time here? Set up your login" : "I already have a login"}</button>
    </form>
  );
}
