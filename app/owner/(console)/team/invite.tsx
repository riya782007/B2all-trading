"use client";
import { useActionState } from "react";
import { inviteStaff, type FormState } from "@/app/actions";
export default function Invite({ roles, live }: { roles: { id: string; name: string }[]; live: boolean }) {
  const [s, act, pending] = useActionState<FormState, FormData>(inviteStaff, {});
  return (
    <form action={act} className="card-tonal mt-4 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
      <label className="field"><span>Name</span><input name="name" required className="input" /></label>
      <label className="field"><span>Work email</span><input name="email" type="email" required={live} className="input" /></label>
      <label className="field"><span>Role</span><select name="role_id" className="input">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <button className="btn btn-filled" disabled={pending}>{pending ? "Adding…" : "Add person"}</button>
      {s.error && <p role="alert" className="text-sm font-medium text-err sm:col-span-4">{s.error}</p>}
      {s.ok && <p role="status" className="text-sm font-medium text-pri sm:col-span-4">{s.ok}</p>}
    </form>
  );
}
