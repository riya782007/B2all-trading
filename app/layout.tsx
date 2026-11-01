import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "B2All Commo · Materials that move industry", template: "%s · B2All" },
  description: "Coal, ferro alloys, iron ore, scrap and minerals for steel mills, power plants and factories across India.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f1f3f5" }, { media: "(prefers-color-scheme: dark)", color: "#13171c" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="en" data-theme={theme === "dark" || theme === "light" ? theme : "system"}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
