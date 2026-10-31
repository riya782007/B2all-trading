import "server-only";

export const hasGmail = Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_SENDER);
export const hasAI = Boolean(process.env.OPENAI_API_KEY);

/** Sends an email from the company's Gmail (OAuth refresh token). Returns false when Gmail is not connected. */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!hasGmail || !to) return false;
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GMAIL_CLIENT_ID!, client_secret: process.env.GMAIL_CLIENT_SECRET!, refresh_token: process.env.GMAIL_REFRESH_TOKEN!, grant_type: "refresh_token" }),
  }).then((r) => r.json()).catch(() => null);
  if (!tok?.access_token) return false;
  const mime = [`From: ${process.env.GMAIL_SENDER}`, `To: ${to}`, `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`, "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "", html].join("\r\n");
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }),
  }).catch(() => null);
  return !!r?.ok;
}

/** Short marketing copy. Falls back to the given text when AI is not configured or fails. */
export async function aiWrite(prompt: string, fallback: string): Promise<string> {
  if (!hasAI) return fallback;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.6, max_tokens: 160, messages: [
        { role: "system", content: "You write short, warm, professional WhatsApp offers for an Indian industrial raw-material trader (coal, ferro alloys, iron ore, scrap, minerals). Under 60 words. No prices unless given. No emojis overload: at most one. No made-up facts." },
        { role: "user", content: prompt }] }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() || fallback;
  } catch { return fallback; }
}
