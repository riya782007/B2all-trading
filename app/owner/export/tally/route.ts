import { NextRequest } from "next/server";
import { getMe, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { tallyXml } from "@/lib/tally";
export async function GET(req: NextRequest) {
  const me = await getMe(); if (!allowed(me, "accounts", "export")) return new Response("Not allowed", { status: 403 });
  const s = await getStore(); const p = req.nextUrl.searchParams;
  const [vs, ls, ps] = await Promise.all([s.all("vouchers"), s.all("ledgers"), s.all("parties")]);
  const pick = p.get("all") ? vs : vs.filter((v) => !v.tally_exported);
  const x = tallyXml(p.get("part") === "masters" ? vs : pick, ls, ps);
  const part = p.get("part") === "masters" ? "masters" : "vouchers";
  return new Response(x[part], { headers: { "cache-control": "private, no-store", "content-type": "application/xml", "content-disposition": `attachment; filename=b2all-tally-${part}.xml` } });
}
