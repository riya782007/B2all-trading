"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export const KEY = "b2_basket";
export function readBasket(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function writeBasket(b: Record<string, number>) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); window.dispatchEvent(new Event("b2basket")); } catch { /* storage unavailable */ }
}

export default function AddToBasket({ id, loggedIn }: { id: string; loggedIn: boolean }) {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const sync = () => setAdded(id in readBasket());
    sync(); window.addEventListener("b2basket", sync);
    return () => window.removeEventListener("b2basket", sync);
  }, [id]);
  if (!loggedIn) return <Link href="/login?next=/" className="btn btn-ghost w-full">Sign in to enquire</Link>;
  return added
    ? <Link href="/basket" className="btn btn-primary w-full">Added · view enquiry</Link>
    : <button className="btn btn-ghost w-full" onClick={() => { const b = readBasket(); b[id] = b[id] ?? 100; writeBasket(b); }}>Add to enquiry</button>;
}
