import { NextResponse } from "next/server";
import {
  generateImageAsset,
  type ImageGenerationOptions,
} from "@/lib/server/presentation/imageGeneration";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt?: unknown;
      instruction?: unknown;
      imageIdSeed?: unknown;
      alt?: unknown;
      options?: unknown;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "prompt missing" }, { status: 400 });
    }

    const image = await generateImageAsset({
      prompt,
      instruction:
        typeof body.instruction === "string" ? body.instruction.trim() : undefined,
      imageIdSeed:
        typeof body.imageIdSeed === "string" ? body.imageIdSeed.trim() : undefined,
      alt: typeof body.alt === "string" ? body.alt.trim() : undefined,
      options: normalizeImageOptions(body.options),
    });

    return NextResponse.json({
      image: {
        imageId: image.imageId,
        mimeType: image.mimeType,
        contentBase64: image.base64,
        prompt: image.prompt,
        alt: image.alt,
        sourcePromptHash: image.sourcePromptHash,
        options: image.options,
        usage: image.usage,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("image generation route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    );
  }
}

function normalizeImageOptions(value: unknown): ImageGenerationOptions | undefined {
  return value && typeof value === "object"
    ? (value as ImageGenerationOptions)
    : undefined;
}
