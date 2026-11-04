"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useSyncExternalStore } from "react";

const ORDER = ["system", "light", "dark"] as const;
type T = (typeof ORDER)[number];

/** Cycles System → Light → Dark. Saved in a cookie so the server renders the right theme with no flash. */
const subscribe = (cb: () => void) => { window.addEventListener("b2theme", cb); return () => window.removeEventListener("b2theme", cb); };
const getTheme = () => (document.documentElement.dataset.theme as T) || "system";
export default function ThemeToggle() {
  const t = useSyncExternalStore(subscribe, getTheme, () => "system" as T);
  const next = () => {
    const n = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    document.documentElement.dataset.theme = n;
    document.cookie = `theme=${n}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event("b2theme"));
  };
  const Icon = t === "dark" ? Moon : t === "light" ? Sun : Monitor;
  return (
    <button onClick={next} className="grid size-11 place-items-center rounded-lg text-ink2 hover:bg-s2 hover:text-ink" aria-label={`Theme: ${t}. Change theme`} title={`Theme: ${t}`}>
      <Icon size={20} />
    </button>
  );
}
