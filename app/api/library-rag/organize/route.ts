import { NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeSupabaseRagLibraryOrganization,
  createOrganizedSupabaseRagLibraryDocument,
} from "@/lib/server/rag/libraryRagOrganization";
import { hasSupabaseRagConfig } from "@/lib/server/rag/supabaseRagClient";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("analyze"),
  }),
  z.object({
    action: z.literal("create_organized_document"),
    documentIds: z.array(z.string().min(1)).min(2).max(12),
    targetTitle: z.string().max(160).optional(),
    groupLabel: z.string().max(160).optional(),
    deleteSourceDocuments: z.boolean().optional(),
  }),
]);

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json().catch(() => ({})));
    if (body.action === "analyze") {
      const result = await analyzeSupabaseRagLibraryOrganization();
      return NextResponse.json({
        ok: true,
        ...result,
      });
    }

    const result = await createOrganizedSupabaseRagLibraryDocument({
      documentIds: body.documentIds,
      targetTitle: body.targetTitle,
      groupLabel: body.groupLabel,
      deleteSourceDocuments: body.deleteSourceDocuments,
    });
    return NextResponse.json({
      ok: true,
      configured: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Library RAG organization failed.";
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
