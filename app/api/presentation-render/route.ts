import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";
import {
  resolveFrameSpecVisualAssets,
  stripFrameSpecVisualAssets,
  type PresentationImageMode,
  type PresentationLibraryImageAsset,
} from "@/lib/server/presentation/imageGeneration";

export const runtime = "nodejs";

function sanitizeFileSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 80) || "presentation";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      documentId?: unknown;
      spec?: unknown;
      frameSpec?: unknown;
      generateImages?: unknown;
      imageMode?: unknown;
      libraryImageAssets?: unknown;
    };
    const documentId =
      typeof body.documentId === "string" && body.documentId.trim()
        ? sanitizeFileSegment(body.documentId.trim())
        : `presentation_${Date.now()}`;

    if (
      (!body.spec || typeof body.spec !== "object") &&
      (!body.frameSpec || typeof body.frameSpec !== "object")
    ) {
      return NextResponse.json({ error: "spec missing" }, { status: 400 });
    }

    const {
      parseFramePresentationSpec,
      parsePresentationSpec,
      renderFramePresentationToFile,
      renderPresentationToFile,
    } =
      await loadPresentationRenderer();
    const parsedFrameSpecInput =
      body.frameSpec && typeof body.frameSpec === "object"
        ? parseFramePresentationSpec(body.frameSpec)
        : null;
    const shouldGenerateImages = body.generateImages === true;
    const imageMode = normalizeImageMode(body.imageMode, shouldGenerateImages);
    const libraryImageAssets = normalizeLibraryImageAssets(body.libraryImageAssets);
    const parsedFrameSpec = parsedFrameSpecInput
      ? shouldGenerateImages
        ? await resolveFrameSpecVisualAssets(parsedFrameSpecInput, {
            mode: imageMode,
            libraryImageAssets,
          })
        : stripFrameSpecVisualAssets(parsedFrameSpecInput)
      : null;
    const parsedSpec = parsedFrameSpec ? null : parsePresentationSpec(body.spec);

    const tempDir = join(tmpdir(), "kin-presentation-render");
    await mkdir(tempDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const baseName = `${documentId}_${timestamp}`;
    const inputPath = join(tempDir, `${baseName}.json`);
    const outputFilename = `${baseName}.pptx`;
    const outputPath = join(tempDir, outputFilename);

    const parsedInput = parsedFrameSpec || parsedSpec;
    if (!parsedInput) {
      return NextResponse.json({ error: "spec missing" }, { status: 400 });
    }
    await writeFile(inputPath, `${JSON.stringify(parsedInput, null, 2)}\n`, "utf8");
    if (parsedFrameSpec) {
      await renderFramePresentationToFile(parsedFrameSpec, outputPath);
    } else if (parsedSpec) {
      await renderPresentationToFile(parsedSpec, outputPath);
    }
    const outputBuffer = await readFile(outputPath);
    await Promise.allSettled([
      rm(inputPath, { force: true }),
      rm(outputPath, { force: true }),
    ]);

    return NextResponse.json({
      output: {
        id: `pptx_${timestamp}`,
        format: "pptx",
        filename: outputFilename,
        contentBase64: outputBuffer.toString("base64"),
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        createdAt: new Date().toISOString(),
        slideCount: parsedFrameSpec?.slideFrames.length || parsedSpec?.slides.length || 0,
        generatedImages:
          parsedFrameSpec && imageMode !== "off"
            ? collectGeneratedImages(parsedFrameSpec as never)
            : [],
        frameSpec: parsedFrameSpec && imageMode !== "off" ? parsedFrameSpec : undefined,
      },
      metadata: {
        title: parsedInput.title,
        theme: parsedInput.theme || "business-clean",
      },
    });
  } catch (error) {
    console.error("presentation render route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Presentation render failed" },
      { status: 500 }
    );
  }
}

function normalizeImageMode(
  value: unknown,
  shouldGenerateImages: boolean
): PresentationImageMode {
  if (
    value === "off" ||
    value === "library" ||
    value === "api" ||
    value === "hybrid"
  ) {
    return value;
  }
  return shouldGenerateImages ? "api" : "off";
}

function normalizeLibraryImageAssets(value: unknown): PresentationLibraryImageAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.imageId !== "string" || typeof record.base64 !== "string") {
      return [];
    }
    return [
      {
        imageId: record.imageId,
        title: typeof record.title === "string" ? record.title : undefined,
        fileName: typeof record.fileName === "string" ? record.fileName : undefined,
        mimeType: typeof record.mimeType === "string" ? record.mimeType : "image/png",
        base64: record.base64,
        description:
          typeof record.description === "string" ? record.description : undefined,
        prompt: typeof record.prompt === "string" ? record.prompt : undefined,
        originalPrompt:
          typeof record.originalPrompt === "string"
            ? record.originalPrompt
            : undefined,
        widthPx: typeof record.widthPx === "number" ? record.widthPx : undefined,
        heightPx: typeof record.heightPx === "number" ? record.heightPx : undefined,
        aspectRatio:
          typeof record.aspectRatio === "number" ? record.aspectRatio : undefined,
        orientation:
          record.orientation === "landscape" ||
          record.orientation === "portrait" ||
          record.orientation === "square" ||
          record.orientation === "unknown"
            ? record.orientation
            : undefined,
      },
    ];
  });
}

function collectGeneratedImages(frameSpec: {
  slideFrames: Array<{
    slideNumber?: number;
    title?: string;
    blocks?: Array<{
      id?: string;
      visualRequest?: {
        brief?: string;
        prompt?: string;
        asset?: {
          imageId?: string;
          mimeType?: string;
          base64?: string;
          usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
        };
      };
    }>;
  }>;
}) {
  return frameSpec.slideFrames.flatMap((slide) =>
    (slide.blocks || []).flatMap((block) => {
      const visual = block.visualRequest;
      const asset = visual?.asset;
      if (!asset?.base64) return [];
      return [
        {
          imageId: asset.imageId || "",
          slideNumber: slide.slideNumber || 0,
          blockId: block.id || "",
          title: visual?.brief || slide.title || "",
          prompt: visual?.prompt || "",
          mimeType: asset.mimeType || "image/png",
          contentBase64: asset.base64,
          usage: asset.usage,
        },
      ];
    })
  );
}

async function loadPresentationRenderer() {
  const [rendererModule, schemaModule] =
    await Promise.all([
      import("@/kin-presentation-renderer/dist/renderer.js"),
      import("@/kin-presentation-renderer/dist/schema.js"),
    ]);
  const renderer = rendererModule as unknown as {
    renderFramePresentationToFile: (spec: unknown, outputPath: string) => Promise<void>;
    renderPresentationToFile: (spec: unknown, outputPath: string) => Promise<void>;
  };
  const schema = schemaModule as unknown as {
    parseFramePresentationSpec: (input: unknown) => {
      title: string;
      theme?: string;
      slideFrames: unknown[];
    };
    parsePresentationSpec: (input: unknown) => {
      title: string;
      theme?: string;
      slides: unknown[];
    };
  };

  return {
    parseFramePresentationSpec: schema.parseFramePresentationSpec,
    parsePresentationSpec: schema.parsePresentationSpec,
    renderFramePresentationToFile: renderer.renderFramePresentationToFile,
    renderPresentationToFile: renderer.renderPresentationToFile,
  };
}
