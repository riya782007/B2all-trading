import "server-only";
import type { Store } from "./store";
import { invoiceViews, orderViews } from "./domain";
import { addDays, fy, r2, STATES, stateFromGstin, today } from "./money";

export type Persona = {
  id: string; name: string; city: string; state: string; phone: string; email: string; whatsapp: string; tags: string[]; notes: string;
  registered: boolean; orders: number; qty: number; spendFY: number; spendAll: number; lastOrder: string | null; daysSince: number | null;
  avgGap: number | null; nextDue: string | null; dueInDays: number | null; topMaterial: string; topMaterialId: string; materials: string[]; categories: string[];
  outstanding: number; overdue: number; offersSent: number; lastOfferAt: string | null; enquiries: number; segment: "New" | "Active" | "Due to reorder" | "Slipping" | "Dormant" | "Never ordered";
};
export type Filter = { q?: string; material?: string; category?: string; city?: string; state?: string; tag?: string; activity?: string; minSpend?: string; dues?: string; reach?: string };

export async function personas(s: Store): Promise<Persona[]> {
  const [parties, ov, inv, mats, sends, enq, profiles] = await Promise.all([s.all("parties", { type: "customer" }), orderViews(s, "sale"), invoiceViews(s, "sale"), s.all("materials"), s.all("offer_sends"), s.all("enquiries"), s.all("profiles")]);
  const t = today(), f = fy();
  return parties.map((p) => {
    const mine = ov.filter((o) => o.party_id === p.id), bills = inv.filter((i) => i.party_id === p.id);
    const dates = mine.map((o) => o.date).sort(); const last = dates.at(-1) ?? null;
    const gaps = dates.slice(1).map((d, i) => (+new Date(d) - +new Date(dates[i])) / 864e5);
    const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    const daysSince = last ? Math.floor((+new Date(t) - +new Date(last)) / 864e5) : null;
    const nextDue = last && avgGap ? addDays(last, avgGap) : null;
    const dueInDays = nextDue ? Math.floor((+new Date(nextDue) - +new Date(t)) / 864e5) : null;
    const byMat = new Map<string, number>(); mine.forEach((o) => byMat.set(o.material_id, (byMat.get(o.material_id) ?? 0) + Number(o.qty)));
    const topId = [...byMat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const myMats = mats.filter((m) => byMat.has(m.id));
    const ps = sends.filter((x) => x.party_id === p.id).sort((a, b) => b.sent_at.localeCompare(a.sent_at));
    const prof = profiles.find((x) => x.id === p.profile_id);
    const segment: Persona["segment"] = !mine.length ? "Never ordered" : daysSince! > 120 ? "Dormant" : dueInDays !== null && dueInDays <= 7 && dueInDays >= -30 ? "Due to reorder" : avgGap && daysSince! > avgGap * 1.5 ? "Slipping" : mine.length === 1 ? "New" : "Active";
    const st = p.state_code || stateFromGstin(p.gstin) || "";
    return {
      id: p.id, name: p.name, city: p.city ?? prof?.city ?? "", state: st ? STATES[st] ?? st : "", phone: p.phone ?? prof?.phone ?? "", email: p.email ?? prof?.email ?? "", whatsapp: p.whatsapp ?? p.phone ?? prof?.phone ?? "",
      tags: p.tags ?? [], notes: p.notes ?? "", registered: !!p.profile_id, orders: mine.length, qty: r2(mine.reduce((a, o) => a + Number(o.qty), 0)),
      spendFY: r2(bills.filter((i) => fy(i.date) === f).reduce((a, i) => a + Number(i.total), 0)), spendAll: r2(bills.reduce((a, i) => a + Number(i.total), 0)),
      lastOrder: last, daysSince, avgGap, nextDue, dueInDays, topMaterial: mats.find((m) => m.id === topId)?.name ?? "", topMaterialId: topId,
      materials: myMats.map((m) => m.id), categories: [...new Set(myMats.map((m) => m.category))], outstanding: r2(bills.reduce((a, i) => a + i.balance, 0)), overdue: bills.filter((i) => i.overdue > 0).length,
      offersSent: ps.length, lastOfferAt: ps[0]?.sent_at ?? null, enquiries: enq.filter((e) => e.customer_id === p.profile_id).length, segment,
    };
  }).sort((a, b) => b.spendAll - a.spendAll || a.name.localeCompare(b.name));
}

export function applyFilter(rows: Persona[], f: Filter) {
  const q = f.q?.trim().toLowerCase();
  return rows.filter((p) =>
    (!q || [p.name, p.city, p.phone, p.email, ...p.tags].some((x) => x.toLowerCase().includes(q))) &&
    (!f.material || p.materials.includes(f.material)) && (!f.category || p.categories.includes(f.category)) &&
    (!f.city || p.city.toLowerCase() === f.city.toLowerCase()) && (!f.state || p.state === f.state) && (!f.tag || p.tags.includes(f.tag)) &&
    (!f.activity || f.activity === "all" || p.segment === f.activity) &&
    (!f.minSpend || p.spendAll >= Number(f.minSpend)) &&
    (!f.dues || (f.dues === "clear" ? p.outstanding <= 0 : f.dues === "owes" ? p.outstanding > 0 : p.overdue > 0)) &&
    (!f.reach || (f.reach === "whatsapp" ? !!p.whatsapp : f.reach === "email" ? !!p.email : true)));
}
