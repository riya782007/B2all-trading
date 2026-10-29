import SiteHeader from "@/components/SiteHeader";
import { getUser, listMaterials } from "@/lib/store";
import { redirect } from "next/navigation";
import BasketView from "./view";

export default async function Basket() {
  const user = await getUser();
  if (!user) redirect("/login?next=/basket");
  return (<><SiteHeader /><main className="mx-auto max-w-2xl px-4 py-8"><BasketView materials={await listMaterials()} /></main></>);
}
