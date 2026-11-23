"use client";
import { useState } from "react";
import { MessageCircle, Mail, Copy, Download, Check, Send } from "lucide-react";
import { wa, mail, mailBcc, sms } from "@/lib/links";
type R = { id: string; name: string; city: string; phone: string; email: string; subject: string; text: string };
export default function Queue({ rows, channel, title }: { rows: R[]; channel: "whatsapp" | "email" | "sms"; title: string }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");
  const can = (r: R) => (channel === "email" ? !!r.email : !!r.phone);
  const href = (r: R) => (channel === "email" ? mail(r.email, r.subject, r.text) : channel === "sms" ? sms(r.phone, r.text) : wa(r.phone, r.text));
  const next = rows.find((r) => can(r) && !done.has(r.id));
  const open = (r: R) => { window.open(href(r), "_blank", "noopener"); setDone((d) => new Set(d).add(r.id)); };
  const copy = async (what: string, label: string) => { try { await navigator.clipboard.writeText(what); setCopied(label); setTimeout(() => setCopied(""), 2000); } catch { setCopied(""); } };
  const csv = () => { const b = new Blob(["Name,Phone,Email,City,Message\n" + rows.map((r) => [r.name, r.phone, r.email, r.city, r.text].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${title.replace(/[^\w]+/g, "-")}.csv`; a.click(); };
  const emails = rows.filter((r) => r.email).map((r) => r.email);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto"><div className="text-sm text-ink2">Progress</div><div className="text-xl font-semibold">{done.size} of {rows.filter(can).length} opened</div><div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-s2"><div className="h-full bg-pri" style={{ width: `${(done.size / Math.max(1, rows.filter(can).length)) * 100}%` }} /></div></div>
        {next ? <button className="btn btn-filled btn-lg" onClick={() => open(next)}><Send size={18} />Send next: {next.name}</button> : <span className="chip chip-green">All sent</span>}
        {channel === "email" && emails.length > 1 && <a className="btn btn-outline" href={mailBcc(emails, rows[0]?.subject ?? title, rows[0]?.text.replace(rows[0].name, "") ?? "")}><Mail size={16} />One email to all (BCC)</a>}
        <button className="btn btn-outline" onClick={() => copy(rows.map((r) => r.phone).filter(Boolean).join("\n"), "numbers")}><Copy size={16} />{copied === "numbers" ? "Copied" : "Copy numbers"}</button>
        <button className="btn btn-outline" onClick={csv}><Download size={16} />CSV for WhatsApp Business</button>
      </div>
      <div className="card divide-y divide-line">{rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1"><div className="font-medium">{r.name} {done.has(r.id) && <Check size={15} className="inline text-ok" />}</div><div className="truncate text-xs text-ink2">{channel === "email" ? r.email || "No email" : r.phone || "No mobile number"} · {r.text.split("\n").find((x) => x.trim() && !x.startsWith(r.subject)) ?? ""}</div></div>
          <button className="btn btn-text btn-sm" onClick={() => copy(r.text, r.id)}><Copy size={14} />{copied === r.id ? "Copied" : "Copy text"}</button>
          {can(r) ? <button className="btn btn-tonal btn-sm" onClick={() => open(r)}>{channel === "email" ? <Mail size={15} /> : <MessageCircle size={15} />}{done.has(r.id) ? "Open again" : "Open"}</button> : <span className="text-xs text-ink2">Add contact on the customer page</span>}
        </div>))}</div>
    </div>
  );
}
