"use client";
import { useEffect, useState } from "react";
import { readBasket } from "./basket";
export default function BasketCount() {
  const [n, setN] = useState(0);
  useEffect(() => { const f = () => setN(Object.keys(readBasket()).length); f(); window.addEventListener("b2basket", f); return () => window.removeEventListener("b2basket", f); }, []);
  return n ? <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-act text-[11px] font-bold text-on-act">{n}</span> : null;
}
