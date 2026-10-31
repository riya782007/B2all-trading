import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { invoiceViews } from "@/lib/domain";
import { Denied, Page } from "@/components/ui";
import MoneyForm from "./form";
export default async function NewVoucher({ searchParams }: { searchParams: Promise<{ type?: string; party?: string; invoice?: string; amount?: string }> }) {
  if (!(await staff("accounts", "create"))) return <Denied />;
  const sp = await searchParams; const type = sp.type === "payment" ? "payment" : sp.type === "expense" ? "expense" : "receipt";
  const s = await getStore();
  const [parties, inv, ledgers] = await Promise.all([s.all("parties"), invoiceViews(s), s.all("ledgers")]);
  const pt = type === "receipt" ? "customer" : "supplier";
  return (
    <Page title={type === "receipt" ? "Payment received" : type === "payment" ? "Payment made" : "Expense"} back={{ href: "/owner/accounts", label: "Day book" }}>
      <div className="max-w-xl"><MoneyForm type={type} parties={parties.filter((p) => p.type === pt).map((p) => ({ id: p.id, name: p.name }))} invoices={inv.filter((i) => i.balance > 0 && i.kind === (type === "receipt" ? "sale" : "purchase")).map((i) => ({ id: i.id, party: i.party_id, label: `${i.number} · balance ₹${i.balance.toLocaleString("en-IN")}`, balance: i.balance }))} expenseLedgers={ledgers.filter((l) => l.grp.includes("Expenses")).map((l) => l.name)} preset={{ party: sp.party, invoice: sp.invoice, amount: sp.amount }} /></div>
    </Page>
  );
}
