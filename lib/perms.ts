export type Mod = "crm" | "sales" | "purchase" | "inventory" | "accounts" | "admin";
export type Act = "view" | "create" | "edit" | "export";
export const MODS: { key: Mod; label: string; hint: string; acts: Act[] }[] = [
  { key: "crm", label: "Customers and offers", hint: "Customers, enquiries, offers", acts: ["view", "create", "edit", "export"] },
  { key: "sales", label: "Sales", hint: "Sales orders, contracts, sales invoices", acts: ["view", "create", "edit", "export"] },
  { key: "purchase", label: "Purchase", hint: "Purchase orders, supplier bills", acts: ["view", "create", "edit", "export"] },
  { key: "inventory", label: "Stock and dispatch", hint: "Stock, dispatches, receipts, vehicles, e-way bills", acts: ["view", "create", "edit", "export"] },
  { key: "accounts", label: "Accounts", hint: "Vouchers, ledgers, outstanding, GST, Tally", acts: ["view", "create", "edit", "export"] },
  { key: "admin", label: "Team and settings", hint: "People, roles, company settings, activity", acts: ["view", "edit"] },
];
export function can(role: "owner" | "staff" | "customer" | undefined, perms: Record<string, string[]> | undefined, m: Mod, a: Act) {
  if (role === "owner") return true;
  if (role !== "staff") return false;
  return !!perms?.[m]?.includes(a);
}
