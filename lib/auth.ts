import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabase, supabaseServer } from "./supabase";
import { getStore } from "./store";
import { can, type Act, type Mod } from "./perms";
import type { Profile, Role } from "./types";

export type Me = { profile: Profile; role: Role | null };

export const getMe = cache(async (): Promise<Me | null> => {
  const s = await getStore();
  let profile: Profile | null = null;
  if (hasSupabase) {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (user) profile = await s.one("profiles", user.id);
  } else {
    const id = (await cookies()).get("b2_session")?.value;
    if (id) profile = await s.one("profiles", id);
  }
  if (!profile) return null;
  const role = profile.staff_role_id ? await s.one("roles", profile.staff_role_id) : null;
  return { profile, role };
});

export const isStaff = (me: Me | null) => !!me && (me.profile.role === "owner" || me.profile.role === "staff");
export const allowed = (me: Me | null, m: Mod, a: Act = "view") => !!me && can(me.profile.role, me.role?.perms, m, a);

/** Console pages: not signed in as staff -> sign-in page. Signed in but role lacks access -> null (page shows "No access"). */
export async function staff(m?: Mod, a: Act = "view") {
  const me = await getMe();
  if (!isStaff(me)) redirect("/owner/login");
  if (m && !allowed(me, m, a)) return null;
  return me!;
}
export async function mustStaff(m: Mod, a: Act) {
  const me = await getMe();
  if (!isStaff(me) || !allowed(me, m, a)) throw new Error("Your role does not allow this.");
  return me!;
}
