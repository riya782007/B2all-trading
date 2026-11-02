"use client";
export const KEY = "b2_basket";
export function readBasket(): Record<string, number> { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
export function writeBasket(b: Record<string, number>) { try { localStorage.setItem(KEY, JSON.stringify(b)); window.dispatchEvent(new Event("b2basket")); } catch { /* storage blocked */ } }

export const subscribeBasket = (cb: () => void) => { window.addEventListener("b2basket",cb); window.addEventListener("storage",cb); return () => { window.removeEventListener("b2basket",cb); window.removeEventListener("storage",cb); }; };
export const basketSnapshot = () => JSON.stringify(readBasket());
