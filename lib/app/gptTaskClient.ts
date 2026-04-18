import type {
  UploadKind,
  ImageDetail,
  IngestMode,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  buildTaskPrepEnvelope,
  resolveCanonicalDocumentText,
} from "@/lib/app/ingestDocumentModel";

export function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function resolveUploadKindFromFile(
  file: File,
  requestedKind: UploadKind
): UploadKind {
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

  if (ext === "pdf") {
    return "pdf";
  }

  if (file.type.startsWith("image/") || visualExtensions.has(ext)) {
    return "image";
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

  const rawText =
    typeof result?.rawText === "string" ? result.rawText : "";
  const detailedText = Array.isArray(result?.kinDetailed)
    ? result.kinDetailed.join("\n")
    : "";
  const compactText = Array.isArray(result?.kinCompact)
    ? result.kinCompact.join("\n")
    : "";
  const content = resolveCanonicalDocumentText({
    rawText,
    fallbackText: detailedText || compactText,
  });

  return buildTaskPrepEnvelope({
    fileName,
    title,
    content,
  });
}

type TaskCallArgs = {
  type: "PREP_TASK" | "DEEPEN_TASK" | "FORMAT_TASK";
  goal: string;
  inputRef: string;
  inputSummary: string;
  constraints: string[];
};

export type BuildTaskStructuredInputArgs = {
  title?: string;
  userInstruction?: string;
  body?: string;
  searchRawText?: string;
};

export function buildTaskStructuredInput({
  title,
  userInstruction,
  body,
  searchRawText,
}: BuildTaskStructuredInputArgs) {
  return [
    `タスクタイトル: ${title?.trim() || "未設定"}`,
    `ユーザー追加指示: ${userInstruction?.trim() || "なし"}`,
    body?.trim() ? `入力本文:\n${body.trim()}` : "",
    searchRawText?.trim() ? `検索素材:\n${searchRawText.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runFormatTaskForKin(
  inputText: string,
  label = "task-draft"
) {
  return callTaskApi({
    type: "FORMAT_TASK",
    goal: "Convert the prepared task content into an executable Kin task block.",
    inputRef: label,
    inputSummary: inputText,
    constraints: [
      "Return the meta block in English.",
      "Start with <<TASK>> and end with <<END_TASK>>.",
      "Use English section headers only.",
      "Do not invent facts not explicitly present in the input.",
      "If information is missing, put it under IF_MISSING.",
      "Keep proper nouns, quoted names, and original identifiers as-is.",
      "Make the task immediately executable by Kin.",
      "Do not add explanation outside the task block.",
    ],
  });
}

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

const COMMON_EVIDENCE_RULES = [
  "リスト順や番号をランキングと解釈してはいけない",
  "順位や重要度は明示されていない限り決めてはいけない",
  "根拠が不足している場合は確定せず候補として扱う",
  "新しい情報が来た場合は過去の結論を上書きする",
  "以前の選定結果は固定ではない",
];

export async function runAutoPrepTask(inputText: string, label = "ingest-result") {
  return callTaskApi({
    type: "PREP_TASK",
    goal:
      "与えられたタイトル・追加指示・本文・検索素材をもとに、必要十分な範囲でタスク本文を整理する",
    inputRef: label,
    inputSummary: inputText,
    constraints: [
      "タイトルが与えられている場合はその主題を優先する",
      "ユーザー追加指示を最優先で反映する",
      "不要な網羅は避ける",
      "与えられた入力に明示された内容のみを使う",
      "入力にない事実を補わない",
      "不明な点は不明と書く",
      "推測が必要な場合は推測ではなく入力不足として扱う",
      "簡潔かつ実務的に整理する",
      "原則として日本語で整理。ただし入力やユーザー追加指示に明示的な言語指定がある場合はその言語を優先する",
      ...COMMON_EVIDENCE_RULES,
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
      "ユーザー追加指示があればその意図を優先する",
      "新しい事実を捏造しない",
      "不足している情報は不足情報として明示する",
      "必要であれば、追加で集めるべき情報を具体化する",
      "原則として日本語で整理。ただし入力やユーザー追加指示に明示的な言語指定がある場合はその言語を優先する",
      ...COMMON_EVIDENCE_RULES,
    ],
  });
}

export type InjectFileOptions = {
  kind: UploadKind;
  mode: IngestMode;
  detail: ImageDetail;
};

export function buildMergedTaskInput(
  currentTaskText: string,
  newSourceLabel: string,
  newSourceContent: string,
  options?: {
    title?: string;
    userInstruction?: string;
    searchRawText?: string;
  }
) {
  return [
    `タスクタイトル: ${options?.title?.trim() || "未設定"}`,
    `ユーザー追加指示: ${options?.userInstruction?.trim() || "なし"}`,
    "【現在のタスク整理】",
    currentTaskText,
    "",
    `【追加情報: ${newSourceLabel}】`,
    newSourceContent,
    "",
    options?.searchRawText?.trim() ? `【検索素材】\n${options.searchRawText.trim()}\n` : "",
    "上記を統合し、現在タスクを更新してください。",
    "出力では、重複を整理し、不足情報・次アクションも必要に応じて更新してください。",
    "不要な網羅は避けてください。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildTaskInput({
  title,
  userInstruction,
  actionInstruction,
  body,
  material,
}: {
  title: string;
  userInstruction: string;
  actionInstruction: string;
  body: string;
  material: string;
}) {
  return [
    `タスクタイトル: ${title || "未設定"}`,
    `ユーザー追加指示: ${userInstruction || "なし"}`,
    `今回の実行指示: ${actionInstruction || "なし"}`,
    body ? `現在の本文:\n${body}` : "",
    material ? `取込素材:\n${material}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
