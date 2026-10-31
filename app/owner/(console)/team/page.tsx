import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { hasSupabase } from "@/lib/supabase";
import { MODS } from "@/lib/perms";
import { Chip, Denied, Page, Section } from "@/components/ui";
import { saveRole, setStaffRole } from "@/app/actions";
import Invite from "./invite";

export default async function Team() {
  const me = await staff("admin"); if (!me) return <Denied />;
  const edit = allowed(me, "admin", "edit"); const s = await getStore();
  const [people, roles, invites] = await Promise.all([s.all("profiles"), s.all("roles"), s.all("invites")]);
  const team = people.filter((p) => p.role !== "customer").sort((a, b) => (a.role === "owner" ? -1 : 1) - (b.role === "owner" ? -1 : 1));
  const pending = invites.filter((i) => !people.some((p) => p.email?.toLowerCase() === i.email.toLowerCase()));
  return (
    <Page title="Team and roles" sub="Owners can do everything. Everyone else sees only what their role allows, on every screen and every action.">
      <div className="card divide-y divide-line">{team.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="grid size-10 place-items-center rounded-full bg-pri-c font-medium text-on-pri-c">{p.name.charAt(0)}</span>
          <div className="mr-auto"><div className="font-medium">{p.name}{p.id === me.profile.id && <span className="font-normal text-ink2"> (you)</span>}</div><div className="text-sm text-ink2">{p.email ?? ""}</div></div>
          {p.role === "owner" ? <Chip tone="green">Owner</Chip> : edit ? <form action={setStaffRole.bind(null, p.id)} className="flex gap-2"><select name="role_id" defaultValue={p.staff_role_id ?? ""} className="input !h-10 w-48 text-sm" aria-label={`Role for ${p.name}`}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}<option value="remove">Remove access</option></select><button className="btn btn-outline">Save</button></form> : <Chip>{roles.find((r) => r.id === p.staff_role_id)?.name}</Chip>}
        </div>))}
        {pending.map((i) => <div key={i.id} className="flex items-center gap-3 px-5 py-4 text-ink2"><span className="grid size-10 place-items-center rounded-full bg-s3">{i.name.charAt(0)}</span><div className="mr-auto"><div>{i.name}</div><div className="text-sm">{i.email}</div></div><Chip tone="amber">Invited · {roles.find((r) => r.id === i.role_id)?.name}</Chip></div>)}
      </div>
      {edit && <Invite roles={roles.map((r) => ({ id: r.id, name: r.name }))} live={hasSupabase} />}
      <Section title="What each role can do">
        <div className="space-y-4">{[...roles, ...(edit ? [{ id: "new", name: "", perms: {} as Record<string, string[]> }] : [])].map((r) => (
          <form key={r.id} action={saveRole.bind(null, r.id)} className="card p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">{r.id === "new" ? <input name="name" placeholder="New role name, e.g. Logistics" className="input max-w-xs" /> : <input name="name" defaultValue={r.name} className="display max-w-xs bg-transparent text-lg font-medium outline-none" disabled={!edit} aria-label="Role name" />}</div>
            <div className="overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Area</th>{["view", "create", "edit", "export"].map((a) => <th key={a} className="text-center capitalize">{a}</th>)}</tr></thead><tbody>
              {MODS.map((m) => <tr key={m.key}><td><div className="font-medium">{m.label}</div><div className="text-xs text-ink2">{m.hint}</div></td>{(["view", "create", "edit", "export"] as const).map((a) => <td key={a} className="text-center">{m.acts.includes(a) ? <input type="checkbox" name={`${m.key}.${a}`} defaultChecked={r.perms[m.key]?.includes(a)} disabled={!edit} className="size-5 accent-[var(--pri)]" aria-label={`${r.name || "New role"} ${m.label} ${a}`} /> : <span className="text-ink2">·</span>}</td>)}</tr>)}
            </tbody></table></div>
            {edit && <button className="btn btn-filled mt-4">{r.id === "new" ? "Create role" : "Save"}</button>}
          </form>))}</div>
      </Section>
    </Page>
  );
}
