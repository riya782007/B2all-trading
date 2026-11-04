import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getStore } from "@/lib/store";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error && data.user && !data.user.is_anonymous) {
      const s = await getStore(); const existing = await s.one("profiles",data.user.id);
      if (existing && existing.role !== "customer") return NextResponse.redirect(new URL("/owner",req.url));
      // User metadata supplies display fields only, never role, ledger balances or permissions.
      if (!existing) await s.insert("profiles",{ id:data.user.id, role:"customer", name:String(data.user.user_metadata.name || "Customer").slice(0,100), phone:String(data.user.user_metadata.phone || "").slice(0,20), city:String(data.user.user_metadata.city || "").slice(0,100), email:data.user.email });
      const profile = await s.one("profiles",data.user.id);
      if (profile && !(await s.all("parties",{profile_id:profile.id})).length) await s.insert("parties",{ name:profile.company || profile.name, type:"customer", profile_id:profile.id, email:profile.email, phone:profile.phone, city:profile.city, credit_days:15 });
      return NextResponse.redirect(new URL("/account",req.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=expired",req.url));
}
