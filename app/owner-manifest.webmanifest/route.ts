export const dynamic = "force-static";
export function GET() {
  return Response.json({
    name: "B2All Owner Console", short_name: "B2All", description: "Daily desk for B2All Commo",
    start_url: "/owner", scope: "/", display: "standalone", orientation: "any",
    background_color: "#f7f6f1", theme_color: "#163e32",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Enquiries", url: "/owner/enquiries" }, { name: "Send an offer", url: "/owner/offers" }],
  }, { headers: { "content-type": "application/manifest+json" } });
}
