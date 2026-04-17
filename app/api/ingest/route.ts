import { NextResponse } from "next/server";
import {
  buildKinSysInfoBlocks,
  type IngestResult,
} from "@/lib/kinSysInfo";
import { buildIngestPrompt } from "@/lib/server/ingest/promptBuilder";
import { resolveIngestResultSelection } from "@/lib/server/ingest/resultSelection";
import {
  extractIngestOutputText,
  extractIngestUsage,
  fileToBase64,
  inferMimeType,
  isTextLikeFile,
  normalizeFileReadPolicy,
  normalizeImageDetail,
  normalizeIngestMode,
  normalizeParsedIngestResult,
  normalizePositiveLimit,
  normalizeUploadKind,
  resolveUploadKind,
  safeJsonParse,
  splitRawTextIntoLines,
  tryReadUtf8,
} from "@/lib/server/ingest/routeHelpers";

export const runtime = "nodejs";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not set" },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const requestedKind = normalizeUploadKind(form.get("kind"));
    const mode = normalizeIngestMode(form.get("mode"));
    const detail = normalizeImageDetail(form.get("detail"));
    const readPolicy = normalizeFileReadPolicy(form.get("readPolicy"));
    const compactCharLimit = normalizePositiveLimit(
      form.get("compactCharLimit"),
      500
    );
    const simpleImageCharLimit = normalizePositiveLimit(
      form.get("simpleImageCharLimit"),
      500
    );

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "file too large (max 20MB for this route)" },
        { status: 400 }
      );
    }

    const mimeType = inferMimeType(file);
    const uploadKind = resolveUploadKind(file, requestedKind);

    if (uploadKind === "text" && mode === "max" && isTextLikeFile(file)) {
      const rawText = await tryReadUtf8(file);

      if (rawText) {
        const lines = splitRawTextIntoLines(rawText);
        const kinBlocks = buildKinSysInfoBlocks({
          title: file.name,
          sourceKind: mimeType,
          summaryLevel: "full_text",
          contentLines: lines,
          warnings: [],
        });

        return NextResponse.json({
          ok: true,
          resolvedKind: uploadKind,
          result: {
            title: file.name,
            sourceKind: mimeType,
            rawText,
            structuredSummary: [],
            kinCompact: lines.slice(0, 12),
            kinDetailed: lines,
            warnings: [],
          },
          kinBlocks,
          kinBlock: kinBlocks[0] ?? "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        });
      }
    }

    const base64 = await fileToBase64(file);
    const prompt = buildIngestPrompt({
      file,
      mimeType,
      uploadKind,
      mode,
      detail,
      readPolicy,
    });

    const body = {
      model: DEFAULT_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_file",
              filename: file.name,
              file_data: `data:${mimeType};base64,${base64}`,
            },
          ],
        },
      ],
    };

    const openaiRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return NextResponse.json(
        {
          error: "OpenAI ingest failed",
          detail: data,
        },
        { status: openaiRes.status }
      );
    }

    const outputText = extractIngestOutputText(data);
    const parsed = safeJsonParse<IngestResult & { kinDetailed?: string[] }>(
      outputText
    );

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Failed to parse ingestion JSON",
          raw: outputText,
          usage: extractIngestUsage(data),
        },
        { status: 500 }
      );
    }

    const normalized = normalizeParsedIngestResult({
      parsed,
      fileName: file.name,
      mimeType,
    });

    const { selectedLines, summaryLevel } = resolveIngestResultSelection({
      uploadKind,
      readPolicy,
      detail,
      mode,
      compactCharLimit,
      simpleImageCharLimit,
      normalized,
    });

    const kinBlocks = buildKinSysInfoBlocks({
      title: normalized.title,
      sourceKind: normalized.sourceKind,
      summaryLevel,
      contentLines: selectedLines,
      warnings: normalized.warnings,
    });

    return NextResponse.json({
      ok: true,
      resolvedKind: uploadKind,
      result: { ...normalized, selectedLines },
      kinBlocks,
      kinBlock: kinBlocks[0] ?? "",
      usage: extractIngestUsage(data),
    });
  } catch (error) {
    console.error("ingest route error", error);

    return NextResponse.json(
      { error: "ingest route failed" },
      { status: 500 }
    );
  }
}
