import { NextResponse } from "next/server";
import { z } from "zod";
import { searchLibraryRagContext } from "@/lib/server/rag/libraryRagSearch";

const requestSchema = z.object({
  query: z.string().default(""),
  matchCount: z.number().int().min(1).optional(),
  candidateCount: z.number().int().min(1).optional(),
  matchThreshold: z.number().min(-1).max(1).optional(),
  filterMetadata: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json().catch(() => ({})));
    const result = await searchLibraryRagContext({
      query: body.query,
      matchCount: body.matchCount,
      candidateCount: body.candidateCount,
      matchThreshold: body.matchThreshold,
      filterMetadata: body.filterMetadata,
    });

    return NextResponse.json({
      ok: true,
      context: result.context,
      matches: result.matches,
      usage: result.usage,
      skippedReason: result.skippedReason,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Library RAG search failed.";
    return NextResponse.json(
      {
        ok: false,
        context: "",
        matches: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
