"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { NavGroup } from "./Nav";

export default function Breadcrumb({ groups }: { groups: NavGroup[] }) {
  const path = usePathname(), params = useSearchParams();
  const item = groups.flatMap(g => g.items).filter(i => {
    const [base, query] = i.href.split("?");
    return (path === base || (base !== "/owner" && path.startsWith(base + "/"))) && (!query || [...new URLSearchParams(query)].every(([k,v]) => (params.get(k) || (k === "kind" ? "sale" : "")) === v));
  }).sort((a,b) => b.href.length - a.href.length)[0];
  return <nav aria-label="Breadcrumb" className="mr-6 hidden items-center gap-3 text-xs lg:flex"><Link href="/owner" className="text-ink2">Workspace</Link><ChevronRight size={13} className="text-ink2"/><span>{item?.label || "Details"}</span></nav>;
}
