import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Denied, Page } from "@/components/ui";
import PartyForm from "./form";
export default async function NewParty({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const sp = await searchParams; const type = sp.type === "supplier" ? "supplier" : "customer";
  if (!(await staff(type === "customer" ? "crm" : "purchase", "create"))) return <Denied />;
  const p = sp.id ? await (await getStore()).one("parties", sp.id) : null;
  return <Page title={p ? `Edit ${p.name}` : type === "customer" ? "Add a customer" : "Add a supplier"} back={{ href: `/owner/parties?type=${type}`, label: type === "customer" ? "Customers" : "Suppliers" }}><div className="max-w-2xl"><PartyForm type={p?.type ?? type} p={p} /></div></Page>;
}
