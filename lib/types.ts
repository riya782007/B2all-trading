export type Status = "new" | "quoted" | "confirmed" | "dispatched" | "closed";
export type Channel = "whatsapp" | "email" | "sms";

export type Material = { id: string; name: string; category: string; note?: string | null };
export type Customer = {
  id: string; name: string; phone: string; city: string; company?: string | null;
  role: "customer" | "owner"; consent: Record<Channel, boolean>; createdAt: string;
};
export type Item = { materialId: string; name: string; qty: number; unit: string };
export type Enquiry = {
  id: string; customerId: string; customerName: string; customerPhone: string; city: string;
  status: Status; items: Item[]; note?: string | null; createdAt: string;
};
export type Offer = { id: string; title: string; body: string; code?: string | null; validTill?: string | null; sentCount: number };

export const STATUS_LABEL: Record<Status, string> = {
  new: "New", quoted: "Quoted", confirmed: "Confirmed", dispatched: "On the way", closed: "Closed",
};
export const NEXT_STATUS: Partial<Record<Status, Status>> = { new: "quoted", quoted: "confirmed", confirmed: "dispatched", dispatched: "closed" };
export const NEXT_ACTION: Partial<Record<Status, string>> = { new: "Mark quoted", quoted: "Mark confirmed", confirmed: "Mark dispatched", dispatched: "Close" };
