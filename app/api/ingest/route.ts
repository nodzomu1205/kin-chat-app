import { NextResponse } from "next/server";
import {
  buildKinSysInfoBlocks,
  type IngestResult,
} from "@/lib/kinSysInfo";

export const runtime = "nodejs";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type IngestMode = "compact" | "detailed" | "max";
type ImageDetail = "simple" | "detailed" | "max";
type FileUploadKind = "text" | "visual";
type FileReadPolicy = "text_first" | "visual_first" | "hybrid";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "json",
  "csv",
  "tsv",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "go",
  "rs",
  "c",
  "cpp",
  "cs",
  "rb",
  "php",
  "html",
  "css",
  "xml",
  "yml",
  "yaml",
  "sql",
]);

const VISUAL_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "svg",
]);

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const parts: string[] = [];

  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function extractUsage(data: any) {
  const inputTokens =
    typeof data?.usage?.input_tokens === "number" ? data.usage.input_tokens : 0;
  const outputTokens =
    typeof data?.usage?.output_tokens === "number" ? data.usage.output_tokens : 0;
  const totalTokens =
    typeof data?.usage?.total_tokens === "number"
      ? data.usage.total_tokens
      : inputTokens + outputTokens;

  return { inputTokens, outputTokens, totalTokens };
}

function inferMimeType(file: File) {
  return file.type || "application/octet-stream";
}

async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function isTextLikeFile(file: File) {
  const ext = getExtension(file.name);
  return (
    TEXT_EXTENSIONS.has(ext) ||
    file.type.startsWith("text/") ||
    file.type === "application/json"
  );
}

function isVisualLikeFile(file: File) {
  const ext = getExtension(file.name);
  return VISUAL_EXTENSIONS.has(ext) || file.type.startsWith("image/");
}

async function tryReadUtf8(file: File) {
  try {
    const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
    if (!text.trim()) return null;
    return text;
  } catch {
    return null;
  }
}

function splitRawTextIntoLines(text: string, maxLen = 360) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const result: string[] = [];

  for (const raw of rawLines) {
    const line = raw.trimEnd();
    if (!line) {
      result.push("[blank line]");
      continue;
    }

    let rest = line;
    while (rest.length > maxLen) {
      result.push(rest.slice(0, maxLen));
      rest = rest.slice(maxLen);
    }
    if (rest) result.push(rest);
  }

  return result.slice(0, 500);
}

function normalizeIngestMode(value: unknown): IngestMode {
  if (value === "detailed") return "detailed";
  if (value === "max") return "max";
  return "compact";
}

function normalizeImageDetail(value: unknown): ImageDetail {
  if (value === "detailed") return "detailed";
  if (value === "max") return "max";
  return "simple";
}

function normalizePositiveLimit(value: unknown, fallback = 500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(100, Math.min(10000, Math.floor(n)));
}

function clampLinesToCharLimit(lines: string[], limit: number) {
  const joined = lines.filter(Boolean).join("\n").trim();
  if (!joined) return [];
  if (joined.length <= limit) return joined.split("\n");

  const clipped = joined.slice(0, Math.max(0, limit - 1)).trimEnd() + "…";
  return clipped.split("\n");
}

function chooseLinesWithinBudget(lines: string[], fallbacks: string[], limit: number) {
  const primary = lines.filter(Boolean);
  if (primary.length > 0) return clampLinesToCharLimit(primary, limit);
  return clampLinesToCharLimit(fallbacks.filter(Boolean), limit);
}

function normalizeUploadKind(value: unknown): FileUploadKind {
  return value === "visual" ? "visual" : "text";
}

function normalizeFileReadPolicy(value: unknown): FileReadPolicy {
  if (value === "text_first") return "text_first";
  if (value === "visual_first") return "visual_first";
  return "hybrid";
}

function resolveUploadKind(file: File, requestedKind: FileUploadKind) {
  if (isVisualLikeFile(file)) return "visual" as const;
  if (isTextLikeFile(file)) return "text" as const;
  return requestedKind;
}

function buildPrompt(params: {
  file: File;
  mimeType: string;
  uploadKind: FileUploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  readPolicy: FileReadPolicy;
}) {
  const { file, mimeType, uploadKind, mode, detail, readPolicy } = params;

  if (uploadKind === "visual") {
    const detailInstruction =
      detail === "max"
        ? "Use very high granularity when describing layouts, figures, images, and visible text."
        : detail === "detailed"
          ? "Describe layouts, figures, images, and visible text carefully with a moderate amount of detail."
          : "Describe only the minimum details needed to preserve meaning, aiming for a compact result.";

    const policyInstruction =
      readPolicy === "text_first"
        ? `
Reading policy: text-first.
- For PDFs, slides, and document-like images, prioritize readable text extraction over scene description.
- Preserve headings, bullets, labels, numbers, dates, URLs, and wording as faithfully as possible.
- Mention layout, charts, and images only when they change interpretation or supply missing context.
- If text is partially unreadable, say so in warnings instead of guessing.
- rawText should focus on extracted text, not narrative image description.
- structuredSummary should summarize the textual content first.
- kinCompact should be concise text-first notes.
- kinDetailed should preserve more original wording and order, then add only necessary visual notes.
      `.trim()
        : readPolicy === "visual_first"
          ? `
Reading policy: visual-first.
- Prioritize layout, composition, charts, figures, photos, and page structure.
- Include visible text, but do not try to preserve full wording unless it is central.
- rawText may mix short extracted text with visual explanation where helpful.
- structuredSummary, kinCompact, and kinDetailed should center on visual interpretation.
      `.trim()
          : `
Reading policy: hybrid.
- Balance extracted text and visual structure.
- Preserve important text verbatim where possible, especially titles, bullets, labels, numbers, and decisions.
- Also explain layout, charts, diagrams, and imagery when they add meaning.
- kinDetailed should combine text understanding and visual context in a stable, practical way.
      `.trim();

    return `
You are an ingestion engine for a Kin + GPT application.

Goal:
Convert the uploaded visual or document-like file into reliable knowledge that can be injected into a separate persona agent ("Kin") through plain text only.

Return JSON only. No markdown fences.

Rules:
- Preserve factual visible details and readable text.
- Avoid guesses.
- If something is unclear, mention it in warnings.
- Do not identify real people in images.
- Source filename: ${file.name}
- Source mime: ${mimeType}
- Visual detail level: ${detail}
- ${detailInstruction}

${policyInstruction}

Return exactly this JSON shape:
{
  "title": string,
  "sourceKind": string,
  "rawText": string,
  "structuredSummary": string[],
  "kinCompact": string[],
  "kinDetailed": string[],
  "warnings": string[]
}

Constraints:
- kinCompact: short, high-signal lines
- kinDetailed: richer and longer than kinCompact when useful
- No emotional language
- No first-person voice
`.trim();
  }

  const fullModeInstruction =
    mode === "max"
      ? `
Additionally produce kinDetailed with as much preserved information as possible.
- For text-rich files, keep wording and order as much as possible.
- Preserve structure and flow where possible.
      `.trim()
      : mode === "detailed"
        ? `
Additionally produce kinDetailed as a medium-detail version that preserves the main structure and important wording without trying to keep everything.
        `.trim()
        : `
Keep kinCompact highly compressed. If the source text is already short and clear, do not over-compress it.
        `.trim();

  return `
You are an ingestion engine for a Kin + GPT application.

Goal:
Convert the uploaded file into reliable text knowledge that can be injected into a separate persona agent ("Kin") through plain text only.

Return JSON only. No markdown fences.

Rules:
- Preserve factual details, names, numbers, dates, URLs, code identifiers, and file structure when important.
- Avoid guesses.
- If something is unclear, mention it in warnings.
- For code files: summarize purpose, key functions, inputs/outputs, dependencies, and risks.
- For spreadsheets: summarize sheet meaning, important columns, patterns, and notable metrics.
- For presentations: summarize slide narrative, decisions, numbers, and action items.
- Source filename: ${file.name}
- Source mime: ${mimeType}
- Preferred text mode: ${mode}
- File reading policy: ${readPolicy}

${fullModeInstruction}

Return exactly this JSON shape:
{
  "title": string,
  "sourceKind": string,
  "rawText": string,
  "structuredSummary": string[],
  "kinCompact": string[],
  "kinDetailed": string[],
  "warnings": string[]
}

Constraints:
- kinCompact: 4 to 12 short high-signal lines
- kinDetailed: richer and longer than kinCompact when useful
- No emotional language
- No first-person voice
`.trim();
}

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
    const compactCharLimit = normalizePositiveLimit(form.get("compactCharLimit"), 500);
    const simpleImageCharLimit = normalizePositiveLimit(form.get("simpleImageCharLimit"), 500);

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
    const prompt = buildPrompt({
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

    const outputText = getOutputText(data);
    const parsed = safeJsonParse<IngestResult & { kinDetailed?: string[] }>(
      outputText
    );

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Failed to parse ingestion JSON",
          raw: outputText,
          usage: extractUsage(data),
        },
        { status: 500 }
      );
    }

    const normalized = {
      title: parsed.title || file.name,
      sourceKind: parsed.sourceKind || mimeType,
      rawText: parsed.rawText || "",
      structuredSummary: Array.isArray(parsed.structuredSummary)
        ? parsed.structuredSummary
        : [],
      kinCompact: Array.isArray(parsed.kinCompact) ? parsed.kinCompact : [],
      kinDetailed: Array.isArray(parsed.kinDetailed) ? parsed.kinDetailed : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };

    let selectedLines: string[] = [];
    let summaryLevel = "kin_compact";

    if (uploadKind === "visual") {
      if (readPolicy === "text_first") {
        selectedLines = detail === "simple"
          ? chooseLinesWithinBudget(normalized.kinCompact, normalized.structuredSummary, simpleImageCharLimit)
          : normalized.kinDetailed.length > 0
            ? normalized.kinDetailed
            : normalized.kinCompact;
        summaryLevel = "visual_text_first";
      } else if (readPolicy === "hybrid") {
        selectedLines = detail === "simple"
          ? chooseLinesWithinBudget(normalized.kinCompact, normalized.structuredSummary, simpleImageCharLimit)
          : normalized.kinDetailed.length > 0
            ? normalized.kinDetailed
            : normalized.kinCompact;
        summaryLevel = "visual_hybrid";
      } else {
        selectedLines =
          detail === "simple"
            ? chooseLinesWithinBudget(normalized.kinCompact, normalized.structuredSummary, simpleImageCharLimit)
            : detail === "detailed"
              ? chooseLinesWithinBudget(normalized.kinDetailed, normalized.kinCompact, 1400)
              : normalized.kinDetailed.length > 0
                ? normalized.kinDetailed
                : normalized.kinCompact;

        summaryLevel =
          detail === "max"
            ? "visual_detail_max"
            : detail === "detailed"
              ? "visual_detail"
              : "visual_basic";
      }
    } else {
      selectedLines =
        mode === "max"
          ? normalized.kinDetailed.length > 0
            ? normalized.kinDetailed
            : normalized.kinCompact
          : mode === "detailed"
            ? chooseLinesWithinBudget(normalized.kinDetailed, normalized.kinCompact, 1400)
            : chooseLinesWithinBudget(normalized.kinCompact, normalized.structuredSummary, compactCharLimit);

      summaryLevel = mode === "max" ? "full_text" : mode === "detailed" ? "detailed_text" : "compact_text";
    }

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
      usage: extractUsage(data),
    });
  } catch (error) {
    console.error("ingest route error", error);

    return NextResponse.json(
      { error: "ingest route failed" },
      { status: 500 }
    );
  }
}