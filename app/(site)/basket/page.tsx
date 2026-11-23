import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { offersFor } from "@/lib/offers";
import BasketView from "./view";
export const metadata = { title: "My enquiry" };
export default async function Basket({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const me = await getMe();
  if (!me || me.profile.role !== "customer") redirect(`/login?next=${encodeURIComponent(`/basket?${new URLSearchParams(sp)}`)}`);
  const s = await getStore();
  const party = (await s.all("parties", { profile_id: me.profile.id }))[0];
  const [mats, offers] = await Promise.all([s.all("materials"), offersFor(party?.id ?? null, party?.name ?? me.profile.name, party?.city ?? "")]);
  return <div className="mx-auto max-w-2xl px-4 py-10"><BasketView materials={mats.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, category: m.category, unit: m.unit }))} offers={offers.map((o) => ({ id: o.id, title: o.title, code: o.code, discount: o.discount }))} /></div>;
}
