import type {
  FileReadPolicy,
  PostIngestAction,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from "@/lib/app/kinStructuredProtocol";
import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
} from "@/lib/app/kinMultipart";
import {
  buildKinDirectiveLines,
  buildTaskExecutionInstruction,
  parseTransformIntent,
  shouldTransformContent,
  splitTextIntoKinChunks,
  transformTextWithIntent,
} from "@/lib/app/transformIntent";
import { normalizeUsage } from "@/lib/tokenStats";

type UsageInput = Parameters<typeof normalizeUsage>[0];

export function resolveLegacyIngestReadPolicyLabel(policy: FileReadPolicy): string {
  if (policy === "text_first") return "テキスト優先";
  if (policy === "visual_first") return "画像優先";
  return "両対応";
}

export function resolveLegacyIngestActionLabel(action: PostIngestAction): string {
  if (action === "inject_only") return "取込のみ";
  if (action === "inject_and_prep") return "取込＋タスク形成";
  if (action === "inject_prep_deepen") return "取込＋タスク形成＋深掘り";
  return "現在タスクに反映";
}

export function toLegacyIngestTransformResponseMode(
  mode?: ResponseMode
): "strict" | "creative" | undefined {
  if (!mode) return undefined;
  return mode;
}

export function readLegacyDirectiveInputFallback(): string {
  if (typeof document === "undefined") return "";

  const candidates = Array.from(document.querySelectorAll("textarea"));
  const last = candidates.at(-1);
  return last instanceof HTMLTextAreaElement ? last.value.trim() : "";
}

export function buildLegacyIngestBlocksFromText(args: {
  mode: "sys_info" | "sys_task";
  taskSlot?: number;
  title: string;
  content: string;
  directiveLines: string[];
}): string[] {
  if (args.mode === "sys_task") {
    return buildPendingKinInjectionBlocks(
      buildKinSysTaskBlock({
        taskSlot: args.taskSlot,
        title: args.title,
        content: args.content,
        directiveLines: args.directiveLines,
      }),
      {
        noticeLines: DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
      }
    );
  }

  const chunks = splitTextIntoKinChunks(args.content, 2200);
  const total = chunks.length;

  return chunks.map((chunk, index) =>
    buildKinSysInfoBlock({
      taskSlot: args.taskSlot,
      title: args.title,
      content: chunk,
      directiveLines: args.directiveLines,
      partIndex: index + 1,
      partTotal: total,
    })
  );
}

export function buildLegacyPlannerWrappedInput(
  text: string,
  directiveText: string,
  defaultMode: "sys_info" | "sys_task" = "sys_info"
) {
  const intent = parseTransformIntent(directiveText, defaultMode);
  const executionInstruction = buildTaskExecutionInstruction("", intent);

  if (!executionInstruction.trim()) {
    return text;
  }

  return ["ユーザー追加指示:", executionInstruction, "", text].join("\n");
}

export async function maybeTransformLegacyDisplayText(args: {
  text: string;
  intentInput: string;
  responseMode?: ResponseMode;
}) {
  const intent = parseTransformIntent(args.intentInput, "sys_info");
  if (!shouldTransformContent(intent)) {
    return { text: args.text, usage: null as UsageInput | null };
  }

  const transformed = await transformTextWithIntent({
    text: args.text,
    intent,
    responseMode: toLegacyIngestTransformResponseMode(args.responseMode),
  });

  return {
    text: transformed.text.trim() || args.text,
    usage: transformed.usage as UsageInput | null,
  };
}

export function buildLegacyDirectiveLines(input: string) {
  return buildKinDirectiveLines(parseTransformIntent(input, "sys_info"));
}
