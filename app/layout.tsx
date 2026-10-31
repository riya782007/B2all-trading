import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/google-sans";
import "@fontsource-variable/google-sans-flex";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "B2All Commo · Materials that move industry", template: "%s · B2All" },
  description: "Coal, ferro alloys, iron ore, scrap and minerals for steel mills, power plants and factories across India.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7faf6" }, { media: "(prefers-color-scheme: dark)", color: "#0e1411" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="en" data-theme={theme === "dark" || theme === "light" ? theme : "system"}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
