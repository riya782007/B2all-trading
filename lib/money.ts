import Decimal from "decimal.js";
export const r2 = (n: number) => new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
export const moneyProduct = (qty: number, rate: number) => new Decimal(qty).times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
export const inr = (n: number, d = 0) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const today = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
export function validDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date; }
export const addDays = (d: string, n: number) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);
export const fdate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
export const sdate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-");
/** Indian financial year label, e.g. 2026-27 for any date from 1 Apr 2026 to 31 Mar 2027. */
export function fy(d = today()) { const y = +d.slice(0, 4), m = +d.slice(5, 7); const s = m >= 4 ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, "0")}`; }
export const stateFromGstin = (g?: string | null) => (g && /^\d{2}/.test(g) ? g.slice(0, 2) : null);

/** GST split: same state => CGST + SGST (half each), different state => IGST. */
export function gstSplit(taxable: number, rate: number, sameState: boolean) {
  if (![taxable, rate].every(Number.isFinite) || taxable < 0 || rate < 0 || rate > 100) throw new Error("Invalid taxable amount or GST rate.");
  const tax = new Decimal(taxable).times(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  if (sameState) { const half = r2(tax / 2); return { cgst: half, sgst: r2(tax - half), igst: 0, total: r2(taxable + tax) }; }
  return { cgst: 0, sgst: 0, igst: tax, total: r2(taxable + tax) };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function two(n: number) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`; }
function three(n: number) { const h = Math.floor(n / 100), r = n % 100; return [h ? `${ONES[h]} Hundred` : "", r ? two(r) : ""].filter(Boolean).join(" "); }
/** Amount in words, Indian system (crore, lakh). */
export function words(amount: number) {
  if (!Number.isFinite(amount) || amount < 0 || amount >= 1e10) throw new Error("Amount is outside the supported range.");
  const cents = new Decimal(amount).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const rupees = Math.floor(cents / 100), paise = cents % 100;
  if (rupees === 0 && paise === 0) return "Rupees Zero Only";
  const parts: string[] = []; let n = rupees;
  const crore = Math.floor(n / 1e7); n %= 1e7; const lakh = Math.floor(n / 1e5); n %= 1e5; const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${crore > 99 ? three(crore) : two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return `Rupees ${parts.join(" ") || "Zero"}${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}
export const STATES: Record<string, string> = { "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "36": "Telangana", "37": "Andhra Pradesh" };
