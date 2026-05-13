import { NextResponse } from "next/server";
import { resolveHttpUrl } from "@/lib/server/website-map/websiteMapCrawler";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = (searchParams.get("url") || "").trim();
    const url = resolveHttpUrl(rawUrl);
    const response = await fetch(url.toString(), {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KinChatWebsiteMap/0.1; +https://example.invalid)",
      },
    });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `File download failed: ${response.status}` },
        { status: response.status }
      );
    }
    const bytes = await response.arrayBuffer();
    const headers = new Headers();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    headers.set("content-type", contentType);
    headers.set("x-final-url", response.url || url.toString());
    const disposition = response.headers.get("content-disposition");
    if (disposition) headers.set("content-disposition", disposition);
    return new Response(bytes, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "File download failed.",
      },
      { status: 500 }
    );
  }
}
