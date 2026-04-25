import type {
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  buildTaskPrepEnvelope,
  resolveCanonicalDocumentText,
} from "@/lib/app/ingest/ingestDocumentModel";
import type { TaskRequest } from "@/types/task";

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

type IngestTaskApiResult = {
  result?: {
    title?: string;
    rawText?: string;
    kinDetailed?: unknown[];
    kinCompact?: unknown[];
  };
};

export type TaskCallArgs =
  | {
      type: "PREP_TASK" | "DEEPEN_TASK";
      goal: string;
      inputRef: string;
      inputSummary: string;
      constraints: string[];
    }
  | {
      type: "FORMAT_TASK";
      goal: string;
      inputRef: string;
      inputSummary: string;
      constraints: string[];
      existingTitle?: string | null;
    };

export function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function resolveUploadKindFromFile(
  file: File,
  requestedKind: UploadKind
): UploadKind {
  const ext = getExtension(file.name);

  if (ext === "pdf") {
    return "pdf";
  }

  if (file.type.startsWith("image/") || VISUAL_EXTENSIONS.has(ext)) {
    return "image";
  }

  if (
    TEXT_EXTENSIONS.has(ext) ||
    file.type.startsWith("text/") ||
    file.type === "application/json"
  ) {
    return "text";
  }

  return requestedKind;
}

export function buildPrepInputFromIngestResult(
  data: IngestTaskApiResult,
  fileName: string
) {
  const result = data?.result ?? {};
  const title =
    typeof result.title === "string" && result.title.trim()
      ? result.title.trim()
      : fileName;
  const rawText = typeof result.rawText === "string" ? result.rawText : "";
  const detailedText = Array.isArray(result.kinDetailed)
    ? result.kinDetailed
        .filter((line): line is string => typeof line === "string")
        .join("\n")
    : "";
  const compactText = Array.isArray(result.kinCompact)
    ? result.kinCompact
        .filter((line): line is string => typeof line === "string")
        .join("\n")
    : "";

  return buildTaskPrepEnvelope({
    fileName,
    title,
    content: resolveCanonicalDocumentText({
      rawText,
      fallbackText: detailedText || compactText,
    }),
  });
}

export function buildTaskApiRequestBody(args: TaskCallArgs): { task: TaskRequest } {
  return {
    task: {
      type: args.type,
      taskId: `task-${Date.now()}`,
      dataKind: "document_package",
      goal: args.goal,
      inputRef: args.inputRef,
      inputSummary: args.inputSummary,
      constraints: args.constraints,
      outputFormat: "sections",
      priority: "HIGH",
      visibility: "INTERNAL",
      responseMode: "STRUCTURED_RESULT",
      ...(args.type === "FORMAT_TASK"
        ? { existingTitle: args.existingTitle?.trim() || null }
        : {}),
    },
  };
}
