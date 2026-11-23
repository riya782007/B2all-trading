"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { House, Inbox, FileText, FileSignature, ReceiptIndianRupee, ShoppingCart, FileInput, GitCompareArrows, Boxes, Truck, Route, BookOpen, Clock, Library, Scale, FileDown, Users, Megaphone, Factory, ShieldCheck, Settings, History, ArrowDownLeft, ArrowUpRight, Wallet, UserPlus, Menu, X, Plus, Keyboard, Landmark, TrendingUp } from "lucide-react";
const ICONS = { House, Inbox, FileText, FileSignature, ReceiptIndianRupee, ShoppingCart, FileInput, GitCompareArrows, Boxes, Truck, Route, BookOpen, Clock, Library, Scale, FileDown, Users, Megaphone, Factory, ShieldCheck, Settings, History, ArrowDownLeft, ArrowUpRight, Wallet, UserPlus, Keyboard, Landmark, TrendingUp };
import Logo from "@/components/Logo";

export type NavGroup = { label: string; items: { href: string; label: string; icon: keyof typeof ICONS; badge?: number }[] };

function List({ groups, onPick }: { groups: NavGroup[]; onPick?: () => void }) {
  const path = usePathname();
  const params = useSearchParams();
  const active = (h: string) => { const [base, query] = h.split("?"); return (base === "/owner" ? path === base : path === base || path.startsWith(base + "/")) && (!query || [...new URLSearchParams(query)].every(([k,v]) => (params.get(k) || (k === "kind" ? "sale" : "")) === v)); };
  return (
    <nav className="space-y-5" aria-label="Console">
      {groups.map((g) => (
        <div key={g.label}>
          {g.label && <div className="mb-2 px-3 text-[.6rem] font-semibold uppercase tracking-[.16em] text-rail-ink">{g.label}</div>}
          {g.items.map((i) => { const Icon = ICONS[i.icon]; return (
            <Link key={i.href} href={i.href} onClick={onPick} className="navitem" aria-current={active(i.href) ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.7} /><span className="flex-1">{i.label}</span>{!!i.badge && <span className="grid h-5 min-w-5 place-items-center rounded-md bg-act px-1.5 text-[11px] font-bold text-on-act">{i.badge}</span>}
            </Link>); })}
        </div>
      ))}
    </nav>
  );
}

export function SideNav({ groups }: { groups: NavGroup[] }) { return <List groups={groups} />; }

export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return (
    <>
      <button className="grid size-11 place-items-center rounded-lg hover:bg-s2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      <dialog ref={dialog} onClose={() => setOpen(false)} aria-label="Navigation" className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[86%] max-w-xs border-0 bg-rail p-0 backdrop:bg-black/40 lg:hidden">
          <div className="h-full overflow-y-auto bg-rail px-4 pb-6 pt-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between pl-1"><Logo tone="light" /><button className="grid size-11 place-items-center rounded-lg text-rail-ink hover:bg-rail-hover" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
            <List groups={groups} onPick={() => setOpen(false)} />
          </div>
      </dialog>
    </>
  );
}

export function CreateMenu({ items }: { items: { href: string; label: string; icon: keyof typeof ICONS }[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } }; window.addEventListener("keydown",close); return () => window.removeEventListener("keydown",close); }, []);
  if (!items.length) return null;
  return (
    <div className="relative">
      <button ref={trigger} className="btn btn-filled" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"><Plus size={18} /><span className="hidden sm:inline">New</span></button>
      {open && (<>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-s1 py-1.5 shadow-[var(--shadow)]">
          {items.map((i) => { const Icon = ICONS[i.icon]; return <Link role="menuitem" key={i.href} href={i.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-s2"><Icon size={18} className="text-ink2" />{i.label}</Link>; })}
        </div></>)}
    </div>
  );
}
