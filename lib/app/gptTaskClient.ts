import type { FileUploadKind, ImageDetail, IngestMode } from "@/components/panels/gpt/gptPanelTypes";

export function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function resolveUploadKindFromFile(
  file: File,
  requestedKind: FileUploadKind
): FileUploadKind {
  const ext = getExtension(file.name);

  const visualExtensions = new Set([
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "bmp",
    "svg",
  ]);

  const textExtensions = new Set([
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

  if (visualExtensions.has(ext) || file.type.startsWith("image/")) {
    return "visual";
  }

  if (
    textExtensions.has(ext) ||
    file.type.startsWith("text/") ||
    file.type === "application/json"
  ) {
    return "text";
  }

  return requestedKind;
}

export function formatTaskResultText(parsed: any, raw: string) {
  if (!parsed) {
    return raw?.trim() || "⚠️ タスク結果の解析に失敗しました";
  }

  const lines: string[] = [];
  lines.push("【タスク整理結果】");

  if (parsed.summary) {
    lines.push(`概要: ${parsed.summary}`);
  }

  if (Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0) {
    lines.push("", "■ 要点");
    parsed.keyPoints.forEach((point: string) => lines.push(`- ${point}`));
  }

  if (Array.isArray(parsed.detailBlocks) && parsed.detailBlocks.length > 0) {
    parsed.detailBlocks.forEach((block: any) => {
      lines.push("", `■ ${block.title}`);
      if (Array.isArray(block.body)) {
        block.body.forEach((line: string) => lines.push(`- ${line}`));
      }
    });
  }

  if (Array.isArray(parsed.warnings) && parsed.warnings.length > 0) {
    lines.push("", "■ 注意");
    parsed.warnings.forEach((item: string) => lines.push(`- ${item}`));
  }

  if (Array.isArray(parsed.missingInfo) && parsed.missingInfo.length > 0) {
    lines.push("", "■ 不足情報");
    parsed.missingInfo.forEach((item: string) => lines.push(`- ${item}`));
  }

  if (Array.isArray(parsed.nextSuggestion) && parsed.nextSuggestion.length > 0) {
    lines.push("", "■ 次の提案");
    parsed.nextSuggestion.forEach((item: string) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}

export function buildPrepInputFromIngestResult(data: any, fileName: string) {
  const result = data?.result ?? {};

  const title =
    typeof result?.title === "string" && result.title.trim()
      ? result.title.trim()
      : fileName;

  const rawText = typeof result?.rawText === "string" ? result.rawText.trim() : "";
  const summaryLines = Array.isArray(result?.kinCompact) ? result.kinCompact.join("\n") : "";
  const detailedLines = Array.isArray(result?.kinDetailed) ? result.kinDetailed.join("\n") : "";

  return [
    `ファイル名: ${fileName}`,
    `タイトル: ${title}`,
    summaryLines ? `要点:\n${summaryLines}` : "",
    detailedLines ? `詳細情報:\n${detailedLines}` : rawText ? `本文:\n${rawText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

type TaskCallArgs = {
  type: "PREP_TASK" | "DEEPEN_TASK";
  goal: string;
  inputRef: string;
  inputSummary: string;
  constraints: string[];
};

async function callTaskApi(args: TaskCallArgs) {
  const res = await fetch("/api/task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
        groundingMode: "STRICT",
      },
    }),
  });

  return res.json();
}

export async function runAutoPrepTask(inputText: string, label = "ingest-result") {
  return callTaskApi({
    type: "PREP_TASK",
    goal: "与えられた抽出結果を整理し、重要点・不足情報・次の提案を明確化する",
    inputRef: label,
    inputSummary: inputText,
    constraints: [
      "与えられた入力に明示された内容のみを使う",
      "入力にない事実を補わない",
      "不明な点は不明と書く",
      "推測が必要な場合は推測ではなく入力不足として扱う",
      "重要点優先",
      "簡潔",
      "日本語で整理",
    ],
  });
}

export async function runAutoDeepenTask(inputText: string, label = "prep-result") {
  return callTaskApi({
    type: "DEEPEN_TASK",
    goal: "整理結果をもとに、不足情報と次に必要な具体データを明確化する",
    inputRef: label,
    inputSummary: inputText,
    constraints: [
      "与えられた入力に含まれる内容を基準に整理する",
      "新しい事実を捏造しない",
      "不足している情報は不足情報として明示する",
      "必要であれば、追加で集めるべき情報を具体化する",
      "日本語で整理",
    ],
  });
}

export type InjectFileOptions = {
  kind: FileUploadKind;
  mode: IngestMode;
  detail: ImageDetail;
};
