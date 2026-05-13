import { NextResponse } from "next/server";
import { z } from "zod";
import { crawlWebsiteMap } from "@/lib/server/website-map/websiteMapCrawler";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().min(1),
  maxDepth: z.number().int().min(0).max(4).optional(),
  maxPages: z.number().int().min(1).nullable().optional(),
  maxFiles: z.number().int().min(0).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json().catch(() => ({})));
    const result = await crawlWebsiteMap(body.url, {
      maxDepth: body.maxDepth,
      maxPages: body.maxPages,
      maxFiles: body.maxFiles,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Website map failed.",
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}
