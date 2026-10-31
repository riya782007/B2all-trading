"use client";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { readBasket, writeBasket } from "./basket";

export default function AddButton({ id, loggedIn, qty = 100 }: { id: string; loggedIn: boolean; qty?: number }) {
  const [added, setAdded] = useState(false);
  useEffect(() => { const f = () => setAdded(id in readBasket()); f(); window.addEventListener("b2basket", f); return () => window.removeEventListener("b2basket", f); }, [id]);
  if (!loggedIn) return <Link href="/login?next=/%23materials" className="btn btn-outline w-full">Sign in to enquire</Link>;
  if (added) return <Link href="/basket" className="btn btn-tonal w-full"><Check size={18} />In your enquiry</Link>;
  return <button className="btn btn-filled w-full" onClick={() => { const b = readBasket(); b[id] = b[id] ?? qty; writeBasket(b); }}><Plus size={18} />Add to enquiry</button>;
}
