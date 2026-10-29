import { ImageResponse } from "next/og";

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const n = Math.min(Math.max(parseInt(size) || 192, 64), 1024);
  const maskable = new URL(req.url).searchParams.has("maskable");
  const inner = maskable ? n * 0.5 : n * 0.62;
  return new ImageResponse(
    (<div style={{ width: n, height: n, display: "flex", alignItems: "center", justifyContent: "center", background: "#163e32", borderRadius: maskable ? 0 : n * 0.22 }}>
      <div style={{ display: "flex", color: "#f7f6f1", fontSize: inner, fontWeight: 700, fontFamily: "Georgia, serif", letterSpacing: -2 }}>B2</div>
    </div>), { width: n, height: n });
}
