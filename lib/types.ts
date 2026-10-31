// Row shapes mirror the database columns (snake_case) so no mapping layer is needed.
export type Kind = "sale" | "purchase";
export type Profile = {
  id: string; phone: string; name: string; city: string; company?: string | null; email?: string | null;
  role: "customer" | "owner" | "staff"; staff_role_id?: string | null; gstin?: string | null; state_code?: string | null;
  address?: string | null; created_at: string;
};
export type Company = { id: string; name: string; gstin: string; state_code: string; address: string; phone: string; email: string; bank: string; invoice_prefix: string; terms: string };
export type Material = { id: string; name: string; category: string; note?: string | null; hsn: string; gst_rate: number; unit: string; opening_qty: number; opening_rate: number; active: boolean };
export type Party = {
  id: string; name: string; type: "customer" | "supplier"; gstin?: string | null; state_code?: string | null; address?: string | null;
  phone?: string | null; email?: string | null; city?: string | null; profile_id?: string | null; credit_days: number; created_at: string;
};
export type Enquiry = { id: string; customer_id: string; status: "new" | "quoted" | "won" | "lost"; note?: string | null; order_id?: string | null; created_at: string };
export type EnquiryItem = { id: string; enquiry_id: string; material_id: string; qty: number; unit: string };
export type Order = {
  id: string; number: string; kind: Kind; party_id: string; material_id: string; qty: number; rate: number; date: string;
  status: "open" | "closed"; terms?: string | null; enquiry_id?: string | null; closed_note?: string | null; created_at: string;
};
export type Delivery = {
  id: string; order_id: string; bill_no: string; bill_date: string; vehicle_no: string; eway_no?: string | null; eway_valid_till?: string | null;
  qty: number; note?: string | null; entered_by: string; created_at: string; invoice_id?: string | null;
};
export type Contract = {
  id: string; number: string; order_id: string; party_id: string; body: string; status: "draft" | "sent" | "signed" | "cancelled";
  created_at: string; sent_at?: string | null; signed_at?: string | null; signed_name?: string | null; signed_ip?: string | null; doc_hash?: string | null;
};
export type Invoice = {
  id: string; number: string; kind: Kind; party_id: string; order_id: string; date: string; due_date: string; material_id: string;
  qty: number; rate: number; gst_rate: number; taxable: number; cgst: number; sgst: number; igst: number; total: number;
  delivery_ids: string[]; place_of_supply: string; voucher_id?: string | null; created_at: string;
};
export type VType = "sales" | "purchase" | "receipt" | "payment" | "journal" | "contra";
export type Entry = { ledger_id: string; dr: number; cr: number };
export type Voucher = {
  id: string; number: string; type: VType; date: string; party_id?: string | null; invoice_id?: string | null; narration: string;
  entries: Entry[]; amount: number; created_by: string; created_at: string; tally_exported: boolean;
};
export type LedgerGroup = "Sundry Debtors" | "Sundry Creditors" | "Sales Accounts" | "Purchase Accounts" | "Duties & Taxes" | "Bank Accounts" | "Cash-in-Hand" | "Direct Expenses" | "Indirect Expenses" | "Capital Account" | "Indirect Incomes";
export type Ledger = { id: string; name: string; grp: LedgerGroup; party_id?: string | null; opening: number };
export type Offer = { id: string; title: string; body: string; code?: string | null; valid_till?: string | null; created_at: string };
export type OfferSend = { id: string; offer_id: string; party_id: string; channel: "whatsapp" | "email" | "sms"; sent_at: string };
export type Role = { id: string; name: string; perms: Record<string, string[]> };
export type Invite = { id: string; email: string; name: string; role_id: string; created_at: string };
export type Activity = { id: string; at: string; by_name: string; what: string };

export type Tables = {
  profiles: Profile; company: Company; materials: Material; parties: Party; enquiries: Enquiry; enquiry_items: EnquiryItem;
  orders: Order; deliveries: Delivery; contracts: Contract; invoices: Invoice; vouchers: Voucher; ledgers: Ledger;
  offers: Offer; offer_sends: OfferSend; roles: Role; invites: Invite; activity: Activity;
};
export type Table = keyof Tables;
