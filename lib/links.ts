/** Indian mobile numbers are stored as typed; WhatsApp needs the country code. */
export const waNumber = (phone: string) => { const d = phone.replace(/\D/g, "").replace(/^0+/, ""); return d.length === 10 ? `91${d}` : d; };
/** Opens a WhatsApp chat with the message already typed. The owner only taps send. */
export const wa = (phone: string, text: string) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
export const mail = (email: string, subject: string, body: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export const mailBcc = (emails: string[], subject: string, body: string) => `mailto:?bcc=${emails.map(encodeURIComponent).join(",")}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export const sms = (phone: string, text: string) => `sms:${phone}?&body=${encodeURIComponent(text)}`;
/** Fills {name}, {company}, {material}, {city} in an offer for one customer. */
export const personalise = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
/** A template's title for lists: placeholders read as plain words ("Time to restock their material?"). */
export const templateLabel = (t: string, material?: string) => personalise(t, { name: "each customer", company: "each customer", city: "their city", material: material || "their material" });
