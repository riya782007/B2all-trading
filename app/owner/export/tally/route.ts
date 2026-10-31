import { NextRequest } from "next/server";
import { getMe, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { log } from "@/lib/domain";
import { tallyXml } from "@/lib/tally";
export async function GET(req: NextRequest) {
  const me = await getMe(); if (!allowed(me, "accounts", "export")) return new Response("Not allowed", { status: 403 });
  const s = await getStore(); const p = req.nextUrl.searchParams;
  const [vs, ls, ps] = await Promise.all([s.all("vouchers"), s.all("ledgers"), s.all("parties")]);
  const pick = p.get("all") ? vs : vs.filter((v) => !v.tally_exported);
  const x = tallyXml(p.get("part") === "masters" ? vs : pick, ls, ps);
  if (p.get("part") !== "masters") { for (const v of pick) await s.update("vouchers", v.id, { tally_exported: true }); await log(s, me!.profile.name, `Exported ${pick.length} vouchers for Tally`); }
  const part = p.get("part") === "masters" ? "masters" : "vouchers";
  return new Response(x[part], { headers: { "content-type": "application/xml", "content-disposition": `attachment; filename=b2all-tally-${part}.xml` } });
}
