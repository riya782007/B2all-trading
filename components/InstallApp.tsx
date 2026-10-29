"use client";
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void> };

/** Registers the service worker and offers a one-tap install (Android, Windows) or iPhone instructions. */
export default function InstallApp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (installed || (!evt && !ios)) return null;
  return (
    <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 bg-soft p-4">
      <div><div className="font-semibold">Install B2All on this device</div><div className="text-sm text-muted">Opens like an app, one tap from your home screen.</div></div>
      {evt ? <button className="btn btn-primary !min-h-11 !py-2" onClick={() => evt.prompt()}>Install</button>
        : <button className="btn btn-ghost !min-h-11 !py-2" onClick={() => setOpen(!open)}>How</button>}
      {open && <p className="w-full text-sm text-muted">Tap the Share button in Safari, then “Add to Home Screen”.</p>}
    </div>
  );
}
