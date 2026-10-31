"use client";
export const KEY = "b2_basket";
export function readBasket(): Record<string, number> { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
export function writeBasket(b: Record<string, number>) { try { localStorage.setItem(KEY, JSON.stringify(b)); window.dispatchEvent(new Event("b2basket")); } catch { /* storage blocked */ } }
