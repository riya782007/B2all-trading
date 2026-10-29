/** Opens a WhatsApp chat with the message already typed. The owner only taps send. */
export const wa = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export const mail = (email: string, subject: string, body: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export const sms = (phone: string, text: string) => `sms:${phone}?&body=${encodeURIComponent(text)}`;
