import { NextResponse } from "next/server";
import {
  buildKinSysInfoBlocks,
  type IngestResult,
} from "@/lib/kinSysInfo";

export const runtime = "nodejs";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type IngestMode = "compact" | "full";
type ImageDetail = "basic" | "detailed" | "max";
type FileUploadKind = "text" | "visual";

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
  return value === "full" ? "full" : "compact";
}

function normalizeImageDetail(value: unknown): ImageDetail {
  if (value === "detailed") return "detailed";
  if (value === "max") return "max";
  return "basic";
}

function normalizeUploadKind(value: unknown): FileUploadKind {
  return value === "visual" ? "visual" : "text";
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
}) {
  const { file, mimeType, uploadKind, mode, detail } = params;

  if (uploadKind === "visual") {
    const detailInstruction =
      detail === "max"
        ? "Describe the visible content at very high granularity. Cover composition, framing, face shape, eyes, eyebrows, nose, mouth, hair, skin impression, pose, clothing, accessories, background, visible text, and notable layout details. Do not identify the person."
        : detail === "detailed"
        ? "Describe the visible content carefully, including face, hair, clothing, pose, framing, background, and visible text. Do not identify the person."
        : "Describe only the main subject, basic appearance, setting, and visible text.";

    return `
You are an ingestion engine for a Kin + GPT application.

Goal:
Convert the uploaded visual file into reliable descriptive knowledge that can be injected into a separate persona agent ("Kin") through plain text only.

Return JSON only. No markdown fences.

Rules:
- Preserve factual visible details.
- Avoid guesses.
- If something is unclear, mention it in warnings.
- Do not identify real people in images.
- ${detailInstruction}
- Source filename: ${file.name}
- Source mime: ${mimeType}
- Visual detail level: ${detail}

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
- kinCompact: short, high-signal visual description
- kinDetailed: richer visual description than kinCompact
- No emotional language
- No first-person voice
`.trim();
  }

  const fullModeInstruction =
    mode === "full"
      ? `
Additionally produce kinDetailed with more preserved information.
- For text-rich files, keep wording and order as much as possible.
- Preserve structure and flow where possible.
      `.trim()
      : "kinDetailed may be a richer version of kinCompact if useful.";

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

    if (uploadKind === "text" && mode === "full" && isTextLikeFile(file)) {
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
      selectedLines =
        detail === "basic"
          ? normalized.kinCompact
          : normalized.kinDetailed.length > 0
          ? normalized.kinDetailed
          : normalized.kinCompact;

      summaryLevel =
        detail === "max"
          ? "visual_detail_max"
          : detail === "detailed"
          ? "visual_detail"
          : "visual_basic";
    } else {
      selectedLines =
        mode === "full"
          ? normalized.kinDetailed.length > 0
            ? normalized.kinDetailed
            : normalized.kinCompact
          : normalized.kinCompact;

      summaryLevel = mode === "full" ? "full_text" : "compact_text";
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
      result: normalized,
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