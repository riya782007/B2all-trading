import "server-only";
import { hasSupabase, supabaseServer } from "./supabase";
import { getStore } from "./store";
import { personalise } from "./links";
import { today } from "./money";
import type { Offer } from "./types";

export type LiveOffer = { id: string; title: string; body: string; code: string | null; discount: string | null; material_id: string | null; material: string; valid_till: string | null; forYou: boolean };
const live = (o: Pick<Offer, "valid_till">) => !o.valid_till || o.valid_till >= today();

/** Offers published for everyone on the website. Safe for visitors who are not signed in. */
export async function publicOffers(): Promise<LiveOffer[]> {
  try {
    const s = await getStore(); const mats = await s.all("materials");
    let rows: Offer[];
    if (hasSupabase) { const sb = await supabaseServer(); const { data } = await sb.rpc("public_offers"); rows = (data ?? []) as Offer[]; }
    else rows = (await s.all("offers")).filter((o) => o.channel === "website" && live(o));
    return rows.map((o) => ({ id: o.id, title: personalise(o.title, { name: "there", company: "", city: "your city", material: mats.find((m) => m.id === o.material_id)?.name ?? "our materials" }), body: personalise(o.body, { name: "there", company: "", city: "your city", material: mats.find((m) => m.id === o.material_id)?.name ?? "our materials" }), code: o.code ?? null, discount: o.discount ?? null, material_id: o.material_id ?? null, material: mats.find((m) => m.id === o.material_id)?.name ?? "", valid_till: o.valid_till ?? null, forYou: false }));
  } catch { return []; }
}

/** Offers a signed-in customer can use: ones sent to them, plus website-wide ones. Personalised with their name. */
export async function offersFor(partyId: string | null, name: string, city: string, usual = ""): Promise<LiveOffer[]> {
  try {
    const s = await getStore();
    const [offers, sends, mats, ins] = await Promise.all([s.all("offers"), partyId ? s.all("offer_sends", { party_id: partyId }) : Promise.resolve([]), s.all("materials"), Promise.resolve(null)]);
    void ins;
    const mine = new Set(sends.map((x) => x.offer_id));
    return offers.filter((o) => live(o) && (mine.has(o.id) || o.channel === "website")).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map((o) => {
      const material = mats.find((m) => m.id === o.material_id)?.name ?? "";
      return { id: o.id, title: personalise(o.title, { name, company: name, city, material: material || usual || "your material" }), body: personalise(o.body, { name, company: name, city, material: material || usual || "your material" }), code: o.code ?? null, discount: o.discount ?? null, material_id: o.material_id ?? null, material, valid_till: o.valid_till ?? null, forYou: mine.has(o.id) };
    });
  } catch { return []; }
}
