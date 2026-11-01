"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

const ORDER = ["system", "light", "dark"] as const;
type T = (typeof ORDER)[number];

/** Cycles System → Light → Dark. Saved in a cookie so the server renders the right theme with no flash. */
export default function ThemeToggle() {
  const [t, setT] = useState<T>("system");
  useEffect(() => { setT((document.documentElement.dataset.theme as T) || "system"); }, []);
  const next = () => {
    const n = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    document.documentElement.dataset.theme = n;
    document.cookie = `theme=${n}; path=/; max-age=31536000; samesite=lax`;
    setT(n);
  };
  const Icon = t === "dark" ? Moon : t === "light" ? Sun : Monitor;
  return (
    <button onClick={next} className="grid size-10 place-items-center rounded-lg text-ink2 hover:bg-s2 hover:text-ink" aria-label={`Theme: ${t}. Change theme`} title={`Theme: ${t}`}>
      <Icon size={20} />
    </button>
  );
}
