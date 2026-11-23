import "server-only";
import { hasSupabase, supabaseServer } from "./supabase";
import { getStore } from "./store";
/** Company phone, WhatsApp and email for the public website. Safe for visitors: only these fields. */
export async function publicContact(): Promise<{ whatsapp: string; phone: string; email: string }> {
  try {
    if (hasSupabase) { const sb = await supabaseServer(); const { data } = await sb.rpc("public_contact"); return { whatsapp: data?.whatsapp ?? "", phone: data?.phone ?? "", email: data?.email ?? "" }; }
    const c = await (await getStore()).one("company", "main"); return { whatsapp: c?.whatsapp ?? "", phone: c?.phone ?? "", email: c?.email ?? "" };
  } catch { return { whatsapp: "", phone: "", email: "" }; }
}
