import { getMe, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { stock } from "@/lib/domain";
export async function GET() {
  const me = await getMe(); if (!allowed(me, "inventory", "export")) return new Response("Not allowed", { status: 403 });
  const rows = [["Material", "Unit", "Opening", "In", "Out", "In hand", "Arriving", "To send", "Projected", "Avg rate", "Value"], ...(await stock(await getStore())).map((r) => [r.name, r.unit, r.opening_qty, r.inQty, r.outQty, r.closing, r.pendIn, r.pendOut, r.projected, r.avg, r.value])];
  return new Response(rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=b2all-stock.csv" } });
}
