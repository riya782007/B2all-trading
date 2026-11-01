/** Brand mark: an amber plate with B2 set in expanded heavy Archivo, like a truck number plate. */
export default function Logo({ tone = "ink", size = "md" }: { tone?: "ink" | "light"; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-14 text-xl" : "h-9 w-11 text-[15px]";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid ${box} place-items-center rounded-[7px] bg-act font-extrabold text-on-act shadow-[inset_0_-2px_0_rgb(0_0_0/.15)]`} style={{ fontStretch: "125%" }}>B2</span>
      <span className={`font-extrabold tracking-tight ${size === "lg" ? "text-2xl" : "text-lg"} ${tone === "light" ? "text-rail-hi" : "text-ink"}`} style={{ fontStretch: "118%" }}>B2All</span>
    </span>
  );
}
