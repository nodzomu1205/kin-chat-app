import { NextResponse } from "next/server";
import type { IngestResult } from "@/lib/shared/kinSysInfo";
import { buildIngestPrompt } from "@/lib/server/ingest/promptBuilder";
import { resolveIngestResultSelection } from "@/lib/server/ingest/resultSelection";
import {
  buildIngestOpenAIErrorResponse,
  buildIngestParseFailureResponse,
  buildIngestSuccessResponse,
  buildOpenAIIngestRequestBody,
  buildTextIngestShortcutResponse,
  MAX_INGEST_BYTES,
  OPENAI_INGEST_API_URL,
} from "@/lib/server/ingest/routeBuilders";
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

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function handleIngestRoute(form: FormData) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set" },
      { status: 500 }
    );
  }

  const file = form.get("file");
  const requestedKind = normalizeUploadKind(form.get("kind"));
  const mode = normalizeIngestMode(form.get("mode"));
  const detail = normalizeImageDetail(form.get("detail"));
  const readPolicy = normalizeFileReadPolicy(form.get("readPolicy"));
  const compactCharLimit = normalizePositiveLimit(form.get("compactCharLimit"), 500);
  const simpleImageCharLimit = normalizePositiveLimit(
    form.get("simpleImageCharLimit"),
    500
  );

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_INGEST_BYTES) {
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
      return NextResponse.json(
        buildTextIngestShortcutResponse({
          fileName: file.name,
          mimeType,
          rawText,
          lines: splitRawTextIntoLines(rawText),
        })
      );
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

  const openaiRes = await fetch(OPENAI_INGEST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(
      buildOpenAIIngestRequestBody({
        model: DEFAULT_MODEL,
        prompt,
        fileName: file.name,
        mimeType,
        base64,
      })
    ),
  });

  const data = await openaiRes.json();
  if (!openaiRes.ok) {
    const errorResponse = buildIngestOpenAIErrorResponse({
      detail: data,
      status: openaiRes.status,
    });
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }

  const outputText = extractIngestOutputText(data);
  const parsed = safeJsonParse<IngestResult & { kinDetailed?: string[] }>(outputText);
  const usage = extractIngestUsage(data);

  if (!parsed) {
    const failureResponse = buildIngestParseFailureResponse({
      raw: outputText,
      usage,
    });
    return NextResponse.json(failureResponse.body, { status: failureResponse.status });
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

  return NextResponse.json(
    buildIngestSuccessResponse({
      uploadKind,
      normalized,
      selectedLines,
      summaryLevel,
      usage,
    })
  );
}
