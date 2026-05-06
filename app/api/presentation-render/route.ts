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
import { sanitizeFrameSpecInputForParse } from "@/lib/server/presentation/frameSpecSanitizer";

export const runtime = "nodejs";

function sanitizeFileSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 80) || "presentation";
}

export async function POST(req: Request) {
  let phase = "parse-request";
  let documentIdForError = "";
  let imageModeForError: PresentationImageMode | "unknown" = "unknown";
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
    documentIdForError = documentId;

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
    phase = "parse-frame-spec";
    const parsedFrameSpecInput =
      body.frameSpec && typeof body.frameSpec === "object"
        ? parseFramePresentationSpec(sanitizeFrameSpecInputForParse(body.frameSpec))
        : null;
    const shouldGenerateImages = body.generateImages === true;
    const imageMode = normalizeImageMode(body.imageMode, shouldGenerateImages);
    imageModeForError = imageMode;
    const libraryImageAssets = normalizeLibraryImageAssets(body.libraryImageAssets);
    phase = shouldGenerateImages ? "resolve-frame-visual-assets" : "strip-frame-visual-assets";
    const parsedFrameSpec = parsedFrameSpecInput
      ? shouldGenerateImages
        ? await resolveFrameSpecVisualAssets(parsedFrameSpecInput, {
            mode: imageMode,
            libraryImageAssets,
          })
        : stripFrameSpecVisualAssets(parsedFrameSpecInput)
      : null;
    phase = "parse-legacy-spec";
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
    phase = "write-render-input";
    await writeFile(inputPath, `${JSON.stringify(parsedInput, null, 2)}\n`, "utf8");
    phase = "render-pptx";
    if (parsedFrameSpec) {
      await renderFramePresentationToFile(parsedFrameSpec, outputPath);
    } else if (parsedSpec) {
      await renderPresentationToFile(parsedSpec, outputPath);
    }
    phase = "read-render-output";
    const outputBuffer = await readFile(outputPath);
    await Promise.allSettled([
      rm(inputPath, { force: true }),
      rm(outputPath, { force: true }),
    ]);

    const generatedImages =
      parsedFrameSpec && imageMode !== "off"
        ? collectFrameSpecGeneratedImageSummaries(parsedFrameSpec as never)
        : [];
    const responseBody = {
      output: {
        id: `pptx_${timestamp}`,
        format: "pptx",
        filename: outputFilename,
        contentBase64: outputBuffer.toString("base64"),
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        createdAt: new Date().toISOString(),
        slideCount: parsedFrameSpec
          ? countRenderedFrameSlides(parsedFrameSpec)
          : parsedSpec?.slides.length || 0,
        generatedImages,
      },
      metadata: {
        title: parsedInput.title,
        theme: parsedInput.theme || "business-clean",
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    const serializedError = serializePresentationRenderError(error);
    console.error("presentation render route error:", {
      phase,
      documentId: documentIdForError,
      imageMode: imageModeForError,
      error: serializedError,
      raw: error,
    });
    return NextResponse.json(
      {
        error: serializedError.message,
        debug: {
          phase,
          documentId: documentIdForError,
          imageMode: imageModeForError,
          errorType: serializedError.type,
          errorName: serializedError.name,
        },
      },
      { status: 500 }
    );
  }
}

function serializePresentationRenderError(error: unknown) {
  if (error instanceof Error) {
    return {
      type: "Error",
      name: error.name,
      message: error.message || "Presentation render failed.",
      stack: error.stack,
    };
  }
  if (typeof error === "string") {
    return {
      type: "string",
      name: "",
      message: error.trim() || "Presentation render failed.",
      stack: undefined,
    };
  }
  try {
    const json = JSON.stringify(error);
    return {
      type: typeof error,
      name: "",
      message: json && json !== "{}" ? json : `Presentation render failed. Non-Error throw: ${String(error)}`,
      stack: undefined,
    };
  } catch {
    return {
      type: typeof error,
      name: "",
      message: `Presentation render failed. Non-Error throw: ${String(error)}`,
      stack: undefined,
    };
  }
}

function collectFrameSpecGeneratedImageSummaries(frameSpec: {
  deckFrame?: {
    openingSlide?: { visualRequest?: FrameSpecVisualRequestForImageSummary };
    closingSlide?: { visualRequest?: FrameSpecVisualRequestForImageSummary };
  };
  slideFrames: Array<{
    slideNumber?: number;
    title?: string;
    blocks?: Array<{
      id?: string;
      visualRequest?: FrameSpecVisualRequestForImageSummary;
    }>;
  }>;
}) {
  return [
    ...collectVisualAssetSummary({
      visual: frameSpec.deckFrame?.openingSlide?.visualRequest,
      slideNumber: 1,
      blockId: "openingSlide",
      fallbackTitle: "Opening slide",
    }),
    ...frameSpec.slideFrames.flatMap((slide) =>
      (slide.blocks || []).flatMap((block) =>
        collectVisualAssetSummary({
          visual: block.visualRequest,
          slideNumber: slide.slideNumber || 0,
          blockId: block.id || "",
          fallbackTitle: slide.title || "",
        })
      )
    ),
    ...collectVisualAssetSummary({
      visual: frameSpec.deckFrame?.closingSlide?.visualRequest,
      slideNumber: frameSpec.slideFrames.length + 2,
      blockId: "closingSlide",
      fallbackTitle: "Closing slide",
    }),
  ];
}

type FrameSpecVisualRequestForImageSummary = {
  brief?: string;
  prompt?: string;
  asset?: {
    imageId?: string;
    mimeType?: string;
    usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
  };
};

function collectVisualAssetSummary(args: {
  visual?: FrameSpecVisualRequestForImageSummary;
  slideNumber: number;
  blockId: string;
  fallbackTitle: string;
}) {
  const asset = args.visual?.asset;
  if (!asset) return [];
  return [
    {
      imageId: asset.imageId || "",
      slideNumber: args.slideNumber,
      blockId: args.blockId,
      title: args.visual?.brief || args.fallbackTitle,
      prompt: args.visual?.prompt || "",
      mimeType: asset.mimeType || "image/png",
      usage: asset.usage,
    },
  ];
}

function countRenderedFrameSlides(spec: {
  deckFrame?: {
    openingSlide?: { enabled?: boolean };
    closingSlide?: { enabled?: boolean };
  };
  slideFrames: unknown[];
}) {
  return (
    spec.slideFrames.length +
    (spec.deckFrame?.openingSlide?.enabled ? 1 : 0) +
    (spec.deckFrame?.closingSlide?.enabled ? 1 : 0)
  );
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
