"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as I from "lucide-react";
import Logo from "@/components/Logo";

export type NavGroup = { label: string; items: { href: string; label: string; icon: keyof typeof I; badge?: number }[] };

function List({ groups, onPick }: { groups: NavGroup[]; onPick?: () => void }) {
  const path = usePathname();
  const active = (h: string) => (h === "/owner" ? path === h : path === h || path.startsWith(h + "/"));
  return (
    <nav className="space-y-6" aria-label="Console">
      {groups.map((g) => (
        <div key={g.label}>
          {g.label && <div className="mb-1.5 px-3 text-[.78rem] font-semibold text-rail-ink/60">{g.label}</div>}
          {g.items.map((i) => { const Icon = I[i.icon] as I.LucideIcon; return (
            <Link key={i.href} href={i.href} onClick={onPick} className="navitem" aria-current={active(i.href) ? "page" : undefined}>
              <Icon size={19} strokeWidth={1.9} /><span className="flex-1">{i.label}</span>{!!i.badge && <span className="grid h-5 min-w-5 place-items-center rounded-md bg-act px-1.5 text-[11px] font-bold text-on-act">{i.badge}</span>}
            </Link>); })}
        </div>
      ))}
    </nav>
  );
}

export function SideNav({ groups }: { groups: NavGroup[] }) { return <List groups={groups} />; }

export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button className="grid size-10 place-items-center rounded-lg hover:bg-s2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><I.Menu size={22} /></button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto bg-rail px-4 pb-6 pt-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between pl-1"><Logo tone="light" /><button className="grid size-10 place-items-center rounded-lg text-rail-ink hover:bg-rail-hover" onClick={() => setOpen(false)} aria-label="Close menu"><I.X size={20} /></button></div>
            <List groups={groups} onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export function CreateMenu({ items }: { items: { href: string; label: string; icon: keyof typeof I }[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  if (!items.length) return null;
  return (
    <div className="relative">
      <button className="btn btn-filled" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"><I.Plus size={18} /><span className="hidden sm:inline">New</span></button>
      {open && (<>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-s1 py-1.5 shadow-[var(--shadow)]">
          {items.map((i) => { const Icon = I[i.icon] as I.LucideIcon; return <Link role="menuitem" key={i.href} href={i.href} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-s2"><Icon size={18} className="text-ink2" />{i.label}</Link>; })}
        </div></>)}
    </div>
  );
}
