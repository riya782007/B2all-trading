/** E-way bill validity: 1 day per 200 km for regular cargo, 1 day per 20 km for over-dimensional cargo (CGST Rule 138(10)). Confirm on the official portal. */
export const maxValidityDays = (km: number, odc = false) => (km > 0 ? Math.ceil(km / (odc ? 20 : 200)) : 0);
export function ewayStatus(validTill?: string | null, now = Date.now()): { key: "none" | "active" | "soon" | "ended"; label: string; tone: "green" | "amber" | "grey" } {
  if (!validTill) return { key: "none", label: "None", tone: "grey" };
  const end = new Date(validTill + "T23:59:59").getTime();
  if (end < now) return { key: "ended", label: "Ended", tone: "grey" };
  return end - now < 36 * 36e5 ? { key: "soon", label: "Ends soon", tone: "amber" } : { key: "active", label: "Valid", tone: "green" };
}
