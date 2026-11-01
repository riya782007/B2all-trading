import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { inr } from "@/lib/money";

export function Page({ title, sub, actions, children, back }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      {back && <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink2 hover:text-ink"><ChevronLeft size={16} />{back.label}</Link>}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl"><h1 className="text-[2rem] sm:text-[2.6rem]">{title}</h1>{sub && <p className="mt-2 text-[1.02rem] text-ink2">{sub}</p>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
export function Stat({ label, value, hint, tone = "ink", href, icon: Icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "ink" | "pri" | "ter" | "err"; href?: string; icon?: LucideIcon }) {
  const c = { ink: "text-ink", pri: "text-pri", ter: "text-ter", err: "text-err" }[tone];
  const body = (<div className={`h-full px-5 py-5 ${href ? "transition-colors hover:bg-s2" : ""}`}><div className="flex items-center justify-between text-[.85rem] font-semibold text-ink2"><span>{label}</span>{Icon && <Icon size={17} />}</div><div className={`mt-3 text-[1.85rem] font-extrabold leading-none ${c}`} style={{ fontStretch: "112%" }}>{value}</div>{hint && <div className="mt-2 text-sm text-ink2">{hint}</div>}</div>);
  return href ? <Link href={href} className="block">{body}</Link> : <div>{body}</div>;
}
export const Money = ({ v, d = 0 }: { v: number; d?: number }) => <span className="tabular-nums">{inr(v, d)}</span>;
export function Chip({ tone = "grey", children }: { tone?: "green" | "amber" | "red" | "blue" | "grey"; children: React.ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}
export function Empty({ icon: Icon, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) {
  return <div className="flex flex-col items-center rounded-[14px] border border-dashed border-line px-6 py-12 text-center">{Icon && <div className="mb-3 grid size-12 place-items-center rounded-xl bg-s2 text-ink2"><Icon size={22} /></div>}<div className="display text-lg">{title}</div>{children && <div className="mt-1 max-w-md text-sm text-ink2">{children}</div>}</div>;
}
export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="mt-10"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-[1.15rem]">{title}</h2>{action}</div>{children}</section>;
}
export function Bar({ pct, tone = "pri" }: { pct: number; tone?: "pri" | "err" | "ter" }) {
  const c = { pri: "bg-pri", err: "bg-err", ter: "bg-ter" }[tone];
  return <div className="h-2 w-full overflow-hidden rounded-sm bg-s3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className={`h-full rounded-sm ${c}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>;
}
export function Denied() {
  return <div className="mx-auto max-w-md pt-16"><Empty title="This page isn't part of your role">Ask an owner to give you access under Team and roles.</Empty></div>;
}
export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}
export function Filters({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return <div className="mb-4 flex flex-wrap gap-2">{items.map((i) => <Link key={i.key} href={i.href} className="filter" aria-current={i.key === current}>{i.label}</Link>)}</div>;
}
export function Notice({ tone = "green", children }: { tone?: "green" | "amber" | "red"; children: React.ReactNode }) {
  const c = { green: "bg-ok-c text-on-ok-c", amber: "bg-ter-c text-on-ter-c", red: "bg-err-c text-on-err-c" }[tone];
  return <div role="status" className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${c}`}>{children}</div>;
}
