import { NextResponse } from "next/server";
import { z } from "zod";
import type { ReferenceLibraryItem } from "@/types/chat";
import { indexReferenceLibraryItemForRag } from "@/lib/server/rag/libraryRagIndexing";

const requestSchema = z.object({
  item: z.record(z.unknown()),
});

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json().catch(() => ({})));
    const result = await indexReferenceLibraryItemForRag({
      item: body.item as ReferenceLibraryItem,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Library RAG indexing failed.";
    return NextResponse.json(
      {
        ok: false,
        indexed: false,
        chunkCount: 0,
        error: message,
      },
      { status: 500 }
    );
  }
}
