import { NextResponse } from "next/server";
import { z } from "zod";
import { compactSupabaseRagLibraryDocuments } from "@/lib/server/rag/libraryRagCompaction";
import {
  deleteSupabaseRagLibraryDocument,
  hasSupabaseRagConfig,
  listAllSupabaseRagLibraryDocuments,
  listSupabaseRagLibraryDocuments,
  listSupabaseRagSemanticDuplicateGroups,
} from "@/lib/server/rag/supabaseRagClient";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  duplicateLimit: z.coerce.number().int().min(1).max(100).optional(),
  duplicateThreshold: z.coerce.number().min(0.3).max(0.98).optional(),
});

const deleteSchema = z.object({
  documentId: z.string().min(1),
});

const compactSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(2).max(12),
  title: z.string().max(120).optional(),
  similarityThreshold: z.number().min(0.5).max(0.98).optional(),
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
    const documents = query.limit
      ? await listSupabaseRagLibraryDocuments({
          limit: query.limit,
        })
      : await listAllSupabaseRagLibraryDocuments();
    const semanticDuplicateGroups = await listSupabaseRagSemanticDuplicateGroups({
      maxPairs: query.duplicateLimit,
      minSimilarity: query.duplicateThreshold,
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      documents,
      semanticDuplicateGroups,
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

export async function DELETE(req: Request) {
  try {
    if (!hasSupabaseRagConfig()) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error: "Supabase RAG DB is not configured.",
        },
        { status: 400 }
      );
    }

    const body = deleteSchema.parse(await req.json().catch(() => ({})));
    await deleteSupabaseRagLibraryDocument(body.documentId);

    return NextResponse.json({
      ok: true,
      configured: true,
      documentId: body.documentId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Library RAG document delete failed.";
    return NextResponse.json(
      {
        ok: false,
        configured: hasSupabaseRagConfig(),
        error: message,
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = compactSchema.parse(await req.json().catch(() => ({})));
    const result = await compactSupabaseRagLibraryDocuments(body);
    return NextResponse.json({
      ok: result.compacted,
      configured: hasSupabaseRagConfig(),
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Library RAG compaction failed.";
    return NextResponse.json(
      {
        ok: false,
        configured: hasSupabaseRagConfig(),
        error: message,
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}
