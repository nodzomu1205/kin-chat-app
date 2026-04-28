import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

function sanitizeFileSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 80) || "presentation";
}

function resolveRendererCliPath() {
  return join(process.cwd(), "kin-presentation-renderer", "dist", "cli.js");
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

    const rendererCli = resolveRendererCliPath();
    if (!existsSync(rendererCli)) {
      return NextResponse.json(
        {
          error:
            "Presentation renderer is not built. Run `npm run build` in kin-presentation-renderer.",
        },
        { status: 500 }
      );
    }

    const generatedDir = join(process.cwd(), "public", "generated-presentations");
    const tempDir = join(process.cwd(), ".tmp-presentation-render");
    await mkdir(generatedDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const baseName = `${documentId}_${timestamp}`;
    const inputPath = join(tempDir, `${baseName}.json`);
    const outputFilename = `${baseName}.pptx`;
    const outputPath = join(generatedDir, outputFilename);

    await writeFile(inputPath, `${JSON.stringify(body.spec, null, 2)}\n`, "utf8");
    await execFileAsync(process.execPath, [rendererCli, inputPath, outputPath], {
      cwd: process.cwd(),
      windowsHide: true,
    });

    const spec = body.spec as { title?: unknown; slides?: unknown; theme?: unknown };
    return NextResponse.json({
      output: {
        id: `pptx_${timestamp}`,
        format: "pptx",
        filename: outputFilename,
        path: `/generated-presentations/${outputFilename}`,
        createdAt: new Date().toISOString(),
        slideCount: Array.isArray(spec.slides) ? spec.slides.length : 0,
      },
      metadata: {
        title: typeof spec.title === "string" ? spec.title : "",
        theme: typeof spec.theme === "string" ? spec.theme : "business-clean",
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
