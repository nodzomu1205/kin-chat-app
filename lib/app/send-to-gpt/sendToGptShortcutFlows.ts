import { generateId } from "@/lib/shared/uuid";
import {
  buildSharedIngestOptions,
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingest/ingestClient";
import { buildIngestedDocumentFilename } from "@/lib/app/ingest/ingestDocumentModel";
import { resolveIngestExtractionArtifacts } from "@/lib/app/ingest/fileIngestFlow";
import {
  buildWebsiteMapDocument,
  fetchWebsiteMapPageText,
  fetchWebsiteMap,
  formatWebsiteMapFileLinks,
  formatWebsiteMapPageText,
  formatWebsiteMapText,
} from "@/lib/app/website-map/websiteMapClient";
import type { RunSendToGptFlowArgs } from "@/lib/app/send-to-gpt/sendToGptFlowArgTypes";
import type { Message, SourceItem } from "@/types/chat";
import type { Dispatch, SetStateAction } from "react";

export function extractInlineUrlTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^URL\s*[:：]\s*(https?:\/\/\S+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

export function extractWebsiteMapTarget(text: string) {
  return (
    extractWebsiteMapDisplayTarget(text) ||
    extractSaveWebsiteMapTarget(text) ||
    extractWebsiteMapPageTextTarget(text) ||
    extractWebsiteMapFileLinksTarget(text) ||
    extractWebsiteMapRemoteFileTarget(text)
  );
}

function extractWebsiteMapDisplayTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(
      /^(?:Website\s*Map|Web\s*Map|サイトマップ|ウェブサイトマップ)\s*[:：]\s*(https?:\/\/\S+)$/i
    );
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function extractSaveWebsiteMapTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(
      /^(?:Save\s*Site\s*Map|サイトマップ保存)\s*[:：]\s*(https?:\/\/\S+)$/i
    );
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractWebsiteMapPageTextTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(
      /^(?:Get\s*Site\s*Contents|サイト本文取得)\s*[:：]\s*(https?:\/\/\S+)$/i
    );
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractWebsiteMapFileLinksTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(
      /^(?:Download\s*File|ファイル取得)\s*[:：]\s*(https?:\/\/\S+)$/i
    );
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractWebsiteMapRemoteFileTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(
      /^(?:Download\s*and\s*Read\s*File|ファイル読込)\s*[:：]\s*(https?:\/\/\S+)$/i
    );
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export async function runInlineUrlShortcut(params: {
  rawText: string;
  inlineUrlTarget: string;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: params.rawText,
  };

  params.setGptMessages((prev) => [...prev, userMsg]);
  params.setGptInput("");
  params.setGptLoading(true);

  try {
    const response = await fetch(
      `/api/url-card?url=${encodeURIComponent(params.inlineUrlTarget)}`,
      { cache: "no-store" }
    );
    const data = (await response.json()) as {
      ok?: boolean;
      source?: SourceItem;
      error?: string;
    };

    if (!response.ok || !data.source) {
      throw new Error(data.error || "URL card resolve failed");
    }

    const resolvedSource = data.source as SourceItem;

    params.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "",
        sources: [resolvedSource],
        meta: {
          kind: "normal",
          sourceType: "manual",
        },
      },
    ]);
  } catch (error) {
    console.error(error);
    params.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "URL からカードを作成できませんでした。",
      },
    ]);
  } finally {
    params.setGptLoading(false);
  }
}

export async function runWebsiteMapShortcut(params: {
  rawText: string;
  websiteMapTarget: string;
  recordIngestedDocument: RunSendToGptFlowArgs["recordIngestedDocument"];
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: params.rawText,
  };

  params.setGptMessages((prev) => [...prev, userMsg]);
  params.setGptInput("");
  params.setGptLoading(true);

  try {
    const remoteFileTarget = extractWebsiteMapRemoteFileTarget(params.rawText);
    if (remoteFileTarget) {
      await runRemoteWebsiteMapFileIngest({
        url: remoteFileTarget,
        recordIngestedDocument: params.recordIngestedDocument,
        setGptMessages: params.setGptMessages,
      });
      return;
    }

    const pageTextTarget = extractWebsiteMapPageTextTarget(params.rawText);
    if (pageTextTarget) {
      const pageText = await fetchWebsiteMapPageText(pageTextTarget);
      params.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: formatWebsiteMapPageText(pageText),
          meta: { sourceType: "file_ingest" },
        },
      ]);
      return;
    }

    const result = await fetchWebsiteMap({
      url: params.websiteMapTarget,
      maxDepth: 0,
      maxPages: 1,
    });

    const fileLinksTarget = extractWebsiteMapFileLinksTarget(params.rawText);
    if (fileLinksTarget) {
      params.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: formatWebsiteMapFileLinks(result),
          meta: { sourceType: "file_ingest" },
        },
      ]);
      return;
    }

    const saveTarget = extractSaveWebsiteMapTarget(params.rawText);
    if (!saveTarget) {
      params.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: formatWebsiteMapText(result),
          meta: { sourceType: "file_ingest" },
        },
      ]);
      return;
    }

    const document = buildWebsiteMapDocument(result);
    params.recordIngestedDocument({
      artifactType: "reference_note",
      title: document.title,
      filename: document.filename,
      text: document.text,
      summary: document.summary,
      structuredPayload: document.structuredPayload,
      charCount: document.text.length,
      createdAt: document.timestamp,
      updatedAt: document.timestamp,
    });

    params.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: [
          "Site map saved to the library.",
          "",
          `Title: ${document.title}`,
          `Pages: ${result.pages.length}`,
          `Linked files: ${result.files.length}`,
          `Skipped: ${result.skipped.length}`,
        ].join("\n"),
        meta: { sourceType: "file_ingest" },
      },
    ]);
  } catch (error) {
    console.error(error);
    params.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: [
          "Website map could not be created.",
          "",
          error instanceof Error ? error.message : "Website map failed.",
        ].join("\n"),
        meta: { sourceType: "file_ingest" },
      },
    ]);
  } finally {
    params.setGptLoading(false);
  }
}

async function runRemoteWebsiteMapFileIngest(params: {
  url: string;
  recordIngestedDocument: RunSendToGptFlowArgs["recordIngestedDocument"];
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
}) {
  const response = await fetch(
    `/api/website-map/file?url=${encodeURIComponent(params.url)}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "File download failed.");
  }
  const blob = await response.blob();
  const finalUrl = response.headers.get("x-final-url") || params.url;
  const file = new File([blob], resolveFileNameFromUrl(finalUrl), {
    type: blob.type || response.headers.get("content-type") || "",
  });
  const { response: ingestResponse, data } = await requestFileIngest({
    file,
    options: buildSharedIngestOptions({
      kind: "auto",
      mode: "detailed",
      detail: "detailed",
      readPolicy: "text_first",
      compactCharLimit: 500,
      simpleImageCharLimit: 500,
    }),
  });
  if (!ingestResponse.ok) {
    throw new Error(
      resolveIngestErrorMessage({
        data,
        fallback: "Downloaded file could not be read.",
      })
    );
  }
  const fileTitle = resolveIngestFileTitle({ data, fallback: file.name });
  const { canonicalDocumentText } = resolveIngestExtractionArtifacts({
    data,
    fileName: file.name,
    fileTitle,
  });
  const timestamp = new Date().toISOString();
  const stored = params.recordIngestedDocument({
    artifactType: "reference_note",
    title: fileTitle,
    filename: buildIngestedDocumentFilename({
      title: fileTitle,
      fallbackFilename: file.name,
    }),
    text: canonicalDocumentText,
    summary: `Downloaded from ${finalUrl}`,
    structuredPayload: {
      version: "0.1-website-map-file",
      sourceUrl: finalUrl,
    },
    charCount: canonicalDocumentText.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  params.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: [
        "Downloaded file was read and saved to the library.",
        "",
        `Title: ${fileTitle}`,
        `Document ID: ${stored.id}`,
        `Chars: ${canonicalDocumentText.length.toLocaleString("ja-JP")}`,
      ].join("\n"),
      meta: { sourceType: "file_ingest" },
    },
  ]);
}

function resolveFileNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const name = decodeURIComponent(parsed.pathname.split("/").pop() || "");
    return name || "downloaded-file";
  } catch {
    return "downloaded-file";
  }
}
