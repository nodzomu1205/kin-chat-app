import { NextResponse } from "next/server";
import { fetchWebsiteMapPageText } from "@/lib/server/website-map/websiteMapCrawler";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "URL is required." },
        { status: 400 }
      );
    }
    const result = await fetchWebsiteMapPageText(url);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Website page text failed.",
      },
      { status: 500 }
    );
  }
}
