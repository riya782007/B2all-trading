import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase";
/** Called once a day by Vercel Cron so the free Supabase project never pauses for inactivity. Reads one public row. */
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasSupabase) return NextResponse.json({ ok: true, demo: true });
  const sb = await supabaseServer();
  const { error } = await sb.from("materials").select("id").limit(1);
  return NextResponse.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 500 : 200 });
}
