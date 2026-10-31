import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { getStore } from "@/lib/store";
import BasketView from "./view";
export const metadata = { title: "My enquiry" };
export default async function Basket() {
  const me = await getMe();
  if (!me || me.profile.role !== "customer") redirect("/login?next=/basket");
  const mats = (await (await getStore()).all("materials")).filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, category: m.category, unit: m.unit }));
  return <div className="mx-auto max-w-2xl px-4 py-10"><BasketView materials={mats} /></div>;
}
