import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeFileSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 80) || "presentation";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      documentId?: unknown;
      spec?: unknown;
    };
    const documentId =
      typeof body.documentId === "string" && body.documentId.trim()
        ? sanitizeFileSegment(body.documentId.trim())
        : `presentation_${Date.now()}`;

    if (!body.spec || typeof body.spec !== "object") {
      return NextResponse.json({ error: "spec missing" }, { status: 400 });
    }

    const { parsePresentationSpec, renderPresentationToFile } =
      await loadPresentationRenderer();
    const parsedSpec = parsePresentationSpec(body.spec);

    const tempDir = join(tmpdir(), "kin-presentation-render");
    await mkdir(tempDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const baseName = `${documentId}_${timestamp}`;
    const inputPath = join(tempDir, `${baseName}.json`);
    const outputFilename = `${baseName}.pptx`;
    const outputPath = join(tempDir, outputFilename);

    await writeFile(inputPath, `${JSON.stringify(parsedSpec, null, 2)}\n`, "utf8");
    await renderPresentationToFile(parsedSpec, outputPath);
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
        slideCount: parsedSpec.slides.length,
      },
      metadata: {
        title: parsedSpec.title,
        theme: parsedSpec.theme || "business-clean",
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

async function loadPresentationRenderer() {
  const [{ renderPresentationToFile }, { parsePresentationSpec }] =
    await Promise.all([
      import("@/kin-presentation-renderer/dist/renderer.js"),
      import("@/kin-presentation-renderer/dist/schema.js"),
    ]);

  return { parsePresentationSpec, renderPresentationToFile };
}
