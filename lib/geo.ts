import "server-only";
import { STATES } from "./money";
import type { Store } from "./store";

/** PIN codes and road distance.
 *  - PIN → city, district, state: India Post's public lookup (no key).
 *  - Road distance between two PINs: OpenRouteService (free key in ORS_API_KEY), truck profile.
 *  Every route is cached, so each pair costs one lookup ever. Any failure returns null and staff type the value. */
export const hasRoutes = Boolean(process.env.ORS_API_KEY) || process.env.GEO_MOCK === "1";
// GEO_MOCK=1 is for automated tests only (no network): fixed answers for a few PINs.
const MOCK: Record<string, PinInfo> = { "496001": { pin: "496001", city: "Raigarh", district: "Raigarh", state: "Chhattisgarh", state_code: "22" }, "492001": { pin: "492001", city: "Raipur", district: "Raipur", state: "Chhattisgarh", state_code: "22" }, "440001": { pin: "440001", city: "Nagpur", district: "Nagpur", state: "Maharashtra", state_code: "27" } };
export const validPin = (p?: string | null) => !!p && /^[1-9]\d{5}$/.test(p.trim());

const STATE_CODE = Object.fromEntries(Object.entries(STATES).map(([code, name]) => [name.toLowerCase(), code]));
const ALIASES: Record<string, string> = { "orissa": "21", "chattisgarh": "22", "pondicherry": "34", "delhi": "07", "new delhi": "07" };

async function getJSON(url: string, ms = 6000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" }, cache: "no-store" }); return r.ok ? await r.json() : null; }
  catch { return null; } finally { clearTimeout(t); }
}

export type PinInfo = { pin: string; city: string; district: string; state: string; state_code: string | null };
export async function lookupPin(pin: string): Promise<PinInfo | null> {
  if (!validPin(pin)) return null;
  if (process.env.GEO_MOCK === "1") return MOCK[pin.trim()] ?? null;
  const j = await getJSON(`https://api.postalpincode.in/pincode/${pin.trim()}`);
  const po = Array.isArray(j) && j[0]?.Status === "Success" ? j[0].PostOffice?.[0] : null;
  if (!po) return null;
  const state = String(po.State ?? "");
  return { pin: pin.trim(), city: String(po.Block && po.Block !== "NA" ? po.Block : po.District ?? ""), district: String(po.District ?? ""), state, state_code: STATE_CODE[state.toLowerCase()] ?? ALIASES[state.toLowerCase()] ?? null };
}

async function coords(pin: string): Promise<[number, number] | null> {
  const key = process.env.ORS_API_KEY;
  const j = await getJSON(`https://api.openrouteservice.org/geocode/search/structured?api_key=${key}&postalcode=${pin}&country=IN&size=1`);
  const c = j?.features?.[0]?.geometry?.coordinates;
  return Array.isArray(c) && c.length === 2 ? [Number(c[0]), Number(c[1])] : null;
}

/** Truck road distance in km between two PIN codes, or null if it cannot be worked out. */
export async function roadKm(s: Store, from: string, to: string): Promise<number | null> {
  if (!validPin(from) || !validPin(to)) return null;
  if (from === to) return 5;
  const [a, b] = from < to ? [from, to] : [to, from];
  const hit = (await s.all("route_cache", { from_pin: a, to_pin: b }))[0];
  if (hit) return Number(hit.km);
  if (!hasRoutes) return null;
  if (process.env.GEO_MOCK === "1") { const km = a === "440001" || b === "440001" ? 512 : 248; await s.insert("route_cache", { from_pin: a, to_pin: b, km }); return km; }
  const [ca, cb] = await Promise.all([coords(a), coords(b)]);
  if (!ca || !cb) return null;
  const j = await getJSON(`https://api.openrouteservice.org/v2/directions/driving-hgv?api_key=${process.env.ORS_API_KEY}&start=${ca[0]},${ca[1]}&end=${cb[0]},${cb[1]}`, 9000);
  const m = j?.features?.[0]?.properties?.summary?.distance;
  if (typeof m !== "number" || !(m > 0)) return null;
  const km = Math.round(m / 1000);
  try { await s.insert("route_cache", { from_pin: a, to_pin: b, km }); } catch { /* cache is best-effort */ }
  return km;
}
