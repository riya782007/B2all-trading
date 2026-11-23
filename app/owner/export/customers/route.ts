import { NextResponse } from "next/server";
import { getMe, isStaff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { applyFilter, personas, type Filter } from "@/lib/crm";
/** Customer list with their buying profile, as a spreadsheet (opens in Excel). */
export async function GET(req: Request) {
  const me = await getMe(); if (!isStaff(me) || !allowed(me, "crm", "export")) return new NextResponse("Not allowed", { status: 403 });
  const f = Object.fromEntries(new URL(req.url).searchParams) as Filter;
  const rows = applyFilter(await personas(await getStore()), f);
  const cell = (v: unknown) => { const t = String(v ?? ""); return `"${(/^[=+\-@]/.test(t) ? "'" : "") + t.replace(/"/g, '""')}"`; };
  const head = ["Name", "City", "State", "Phone", "WhatsApp", "Email", "Website account", "Pattern", "Orders", "Buys most", "Last order", "Next expected", "Lifetime billed", "This year", "To receive", "Tags", "Notes"];
  const body = rows.map((p) => [p.name, p.city, p.state, p.phone, p.whatsapp, p.email, p.registered ? "Yes" : "No", p.segment, p.orders, p.topMaterial, p.lastOrder ?? "", p.nextDue ?? "", p.spendAll, p.spendFY, p.outstanding, p.tags.join("; "), p.notes].map(cell).join(","));
  return new NextResponse("﻿" + [head.map(cell).join(","), ...body].join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="B2All-customers.csv"' } });
}
