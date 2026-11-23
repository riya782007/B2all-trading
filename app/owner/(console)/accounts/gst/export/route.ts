import { NextResponse } from "next/server";
import { getMe, isStaff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { gstReturns } from "@/lib/books";
import { STATES } from "@/lib/money";

const csv = (rows: (string | number)[][]) => "﻿" + rows.map((r) => r.map((c) => { const v = String(c ?? ""); return /^[=+\-@]/.test(v) && typeof c === "string" ? `"'${v.replace(/"/g, '""')}"` : `"${v.replace(/"/g, '""')}"`; }).join(",")).join("\r\n");
export async function GET(req: Request) {
  const me = await getMe(); if (!isStaff(me) || !allowed(me, "accounts", "export")) return new NextResponse("Not allowed", { status: 403 });
  const u = new URL(req.url); const m = u.searchParams.get("m") ?? ""; const sec = u.searchParams.get("sec") ?? "b2b";
  if (!/^\d{4}-\d{2}$/.test(m)) return new NextResponse("Bad month", { status: 400 });
  const g = await gstReturns(await getStore(), m);
  const pos = (c: string) => `${c}-${STATES[c] ?? ""}`;
  const d = (x: string) => new Date(x).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
  let rows: (string | number)[][] = [];
  if (sec === "b2b") rows = [["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date", "Invoice Value", "Place Of Supply", "Reverse Charge", "Applicable % of Tax Rate", "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"], ...g.b2b.map((i) => [i.party_snapshot?.gstin || i.party.gstin || "", i.party.name, i.number, d(i.date), Number(i.total), pos(i.place_of_supply), "N", "", "Regular B2B", "", Number(i.gst_rate), Number(i.taxable), 0])];
  else if (sec === "b2c") rows = [["Type", "Invoice Number", "Place Of Supply", "Rate", "Taxable Value", "IGST", "CGST", "SGST"], ...g.b2cl.map((i) => ["B2CL", i.number, pos(i.place_of_supply), Number(i.gst_rate), Number(i.taxable), Number(i.igst), Number(i.cgst), Number(i.sgst)]), ...g.b2cs.map((x) => ["B2CS (OE)", "", pos(x.pos), x.rate, x.taxable, x.igst, x.cgst, x.sgst])];
  else if (sec === "cdnr") rows = [["GSTIN/UIN of Recipient", "Receiver Name", "Note Number", "Note Date", "Note Type", "Against invoice", "Note Value", "Taxable Value", "IGST", "CGST", "SGST"], ...g.cdnr.map((n) => [n.gstin, n.party, n.number, d(n.date), "C", n.against, n.total, n.taxable, n.igst, n.cgst, n.sgst])];
  else if (sec === "hsn") rows = [["HSN", "Description", "UQC", "Total Quantity", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount"], ...g.hsn.map((h) => [h.hsn, h.name, h.unit === "MT" ? "MTS-METRIC TON" : h.unit, h.qty, h.taxable, h.igst, h.cgst, h.sgst])];
  else rows = [["Table", "Nature", "Taxable value", "IGST", "CGST", "SGST"], ["3.1(a)", "Outward taxable supplies", g.out.taxable, g.out.igst, g.out.cgst, g.out.sgst], ["4(A)(5)", "All other ITC", g.itc.taxable, g.itc.igst, g.itc.cgst, g.itc.sgst], ["6.1", "Payable in cash", "", g.payable.igst, g.payable.cgst, g.payable.sgst]];
  return new NextResponse(csv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="GSTR-${sec}-${m}.csv"` } });
}
