import { NextRequest, NextResponse } from "next/server";
import {
  normalizePresentationVisualSlotsWithLlm,
  resolvePresentationVisualNormalizationRequest,
} from "@/lib/server/presentation/visualNormalization";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const request = resolvePresentationVisualNormalizationRequest(body);
    const result = await normalizePresentationVisualSlotsWithLlm(request);
    return NextResponse.json(result);
  } catch (error) {
    console.error("presentation visual normalization failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Presentation visual normalization failed.",
      },
      { status: 500 }
    );
  }
}
