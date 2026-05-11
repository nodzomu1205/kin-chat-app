import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hasSupabaseRagConfig,
  listSupabaseRagLibraryDocuments,
} from "@/lib/server/rag/supabaseRagClient";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: Request) {
  try {
    if (!hasSupabaseRagConfig()) {
      return NextResponse.json({
        ok: true,
        configured: false,
        documents: [],
      });
    }

    const url = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams));
    const documents = await listSupabaseRagLibraryDocuments({
      limit: query.limit,
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      documents,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Library RAG documents failed.";
    return NextResponse.json(
      {
        ok: false,
        configured: hasSupabaseRagConfig(),
        documents: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
