"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Keyboard } from "lucide-react";

type Item = { label: string; hint: string; href: string };
const KEYS: [string, string, string, boolean][] = [
  // key, label, href, needs accounts
  ["F4", "Contra", "/owner/accounts/voucher?type=contra", true],
  ["F5", "Payment", "/owner/accounts/voucher?type=payment", true],
  ["F6", "Receipt", "/owner/accounts/voucher?type=receipt", true],
  ["F7", "Journal", "/owner/accounts/voucher?type=journal", true],
  ["F8", "Sales invoice", "/owner/invoices/new?kind=sale", false],
  ["F9", "Purchase bill", "/owner/invoices/new?kind=purchase", false],
  ["Ctrl+F8", "Credit note", "/owner/accounts/voucher?type=credit_note", true],
  ["Ctrl+F9", "Debit note", "/owner/accounts/voucher?type=debit_note", true],
  ["Alt+C", "Create ledger", "/owner/accounts/ledgers?new=1", true],
];
/** Fuzzy match like Tally's Go To: letters in order, gaps allowed. Lower score is better. */
function score(q: string, t: string) { q = q.toLowerCase(); t = t.toLowerCase(); if (t.includes(q)) return t.indexOf(q); let i = 0, gaps = 0, first = -1; for (let k = 0; k < t.length; k++) { if (t[k] === q[i]) { if (first < 0) first = k; i++; } else if (i) gaps++; if (i === q.length) return 100 + gaps * 10 + first; } return -1; }

export default function Shortcuts({ pages, accounts }: { pages: Item[]; accounts: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [help, setHelp] = useState(false);
  const [q, setQ] = useState(""); const [data, setData] = useState<Item[]>([]); const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const combo = `${e.ctrlKey || e.metaKey ? "Ctrl+" : ""}${e.altKey ? "Alt+" : ""}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`;
      if (combo === "Alt+G" || combo === "Ctrl+K") { e.preventDefault(); setOpen(true); setQ(""); setSel(0); return; }
      if (combo === "Ctrl+/" || combo === "Alt+H") { e.preventDefault(); setHelp((h) => !h); return; }
      if (e.key === "Escape") { setOpen(false); setHelp(false); return; }
      const hit = KEYS.find(([key]) => key === combo);
      if (hit && (!hit[3] || accounts)) { e.preventDefault(); router.push(hit[2]); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [router, accounts]);
  useEffect(() => { if (open) { input.current?.focus(); if (!data.length) fetch("/owner/lookup").then((r) => (r.ok ? r.json() : [])).then(setData).catch(() => {}); } }, [open, data.length]);
  const all = useMemo(() => [...pages, ...KEYS.filter((k) => !k[3] || accounts).map(([key, label, href]) => ({ label, hint: `Shortcut ${key}`, href })), ...data], [pages, data, accounts]);
  const results = useMemo(() => (q.trim() ? all.map((x) => ({ x, s: Math.min(...[score(q, x.label), score(q, x.hint)].filter((n) => n >= 0).concat(9999)) })).filter((r) => r.s < 9999).sort((a, b) => a.s - b.s).slice(0, 12).map((r) => r.x) : pages.slice(0, 12)), [q, all, pages]);
  const go = (it?: Item) => { if (!it) return; setOpen(false); router.push(it.href); };
  return (<>
    <button onClick={() => setHelp(true)} className="hidden size-11 place-items-center rounded-lg hover:bg-s2 lg:grid" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (Ctrl+/)"><Keyboard size={19} /></button>
    {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-s1 shadow-[var(--shadow)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Go to">
        <div className="flex items-center gap-3 border-b border-line px-4"><Search size={18} className="text-ink2" /><input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); } if (e.key === "Enter") go(results[sel]); }} placeholder="Go to a report, ledger, party, invoice… (fuzzy, like Tally)" className="h-14 flex-1 bg-transparent outline-none" /><kbd className="text-[10px] text-ink2">Esc</kbd></div>
        <div className="max-h-[50vh] overflow-auto py-1">{results.map((r, i) => <button key={r.href + i} onMouseEnter={() => setSel(i)} onClick={() => go(r)} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${i === sel ? "bg-s2" : ""}`}><span className="font-medium">{r.label}</span><span className="text-xs text-ink2">{r.hint}</span></button>)}{!results.length && <p className="px-4 py-3 text-sm text-ink2">Nothing found.</p>}</div>
      </div></div>}
    {help && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setHelp(false)}>
      <div className="w-full max-w-md rounded-xl border border-line bg-s1 p-5 shadow-[var(--shadow)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
        <div className="mb-3 font-semibold">Tally keys work here</div>
        <div className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">{[...KEYS.filter((k) => !k[3] || accounts).map(([k, l]) => [k, l]), ["Alt+G", "Go to anything (also Ctrl+K)"], ["Ctrl+A", "Accept / save a voucher"], ["Esc", "Back / close"], ["Enter", "Next line in a voucher"], ["Ctrl+/", "This list"]].map(([k, l]) => <Fragment key={k}><kbd className="w-fit rounded border border-line bg-s2 px-1.5 text-xs font-semibold">{k}</kbd><span>{l}</span></Fragment>)}</div>
      </div></div>}
  </>);
}
