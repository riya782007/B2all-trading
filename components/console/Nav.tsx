"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as I from "lucide-react";

export type NavGroup = { label: string; items: { href: string; label: string; icon: keyof typeof I; badge?: number }[] };

function List({ groups, onPick }: { groups: NavGroup[]; onPick?: () => void }) {
  const path = usePathname();
  const active = (h: string) => (h === "/owner" ? path === h : path === h || path.startsWith(h + "/"));
  return (
    <nav className="space-y-5" aria-label="Console">
      {groups.map((g) => (
        <div key={g.label}>
          {g.label && <div className="mb-1 px-4 text-xs font-medium tracking-wide text-ink2">{g.label}</div>}
          {g.items.map((i) => { const Icon = I[i.icon] as I.LucideIcon; return (
            <Link key={i.href} href={i.href} onClick={onPick} className="navitem" aria-current={active(i.href) ? "page" : undefined}>
              <Icon size={19} strokeWidth={1.9} /><span className="flex-1">{i.label}</span>{!!i.badge && <span className="chip chip-amber !h-5 !px-2">{i.badge}</span>}
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
      <button className="grid size-10 place-items-center rounded-full hover:bg-s3 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><I.Menu size={22} /></button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto bg-s1 p-3 pt-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between px-3"><span className="display text-xl font-semibold text-pri">B2All</span><button className="grid size-10 place-items-center rounded-full hover:bg-s3" onClick={() => setOpen(false)} aria-label="Close menu"><I.X size={20} /></button></div>
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
      <button className="btn btn-filled" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"><I.Plus size={18} /><span className="hidden sm:inline">Create</span></button>
      {open && (<>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-s1 py-2 shadow-xl">
          {items.map((i) => { const Icon = I[i.icon] as I.LucideIcon; return <Link role="menuitem" key={i.href} href={i.href} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-s2"><Icon size={18} className="text-ink2" />{i.label}</Link>; })}
        </div></>)}
    </div>
  );
}
