import {
  formatTaskResultText,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import {
  buildLegacyPlannerWrappedInput,
  maybeTransformLegacyDisplayText,
  resolveLegacyIngestActionLabel,
  resolveLegacyIngestReadPolicyLabel,
} from "@/lib/app/legacyIngestHelpers";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import { normalizeUsage } from "@/lib/tokenStats";

type UsageInput = Parameters<typeof normalizeUsage>[0];

export async function resolveLegacyIngestPostActionTexts(params: {
  action: PostIngestAction;
  prepInput: string;
  liveDirectiveInput: string;
  responseMode?: ResponseMode;
  fileName: string;
  intentMode: "sys_info" | "sys_task";
  applyTaskUsage: (usage: UsageInput) => void;
}) {
  let prepTaskText = "";
  let deepenTaskText = "";

  if (
    params.action !== "inject_and_prep" &&
    params.action !== "inject_prep_deepen"
  ) {
    return { prepTaskText, deepenTaskText };
  }

  try {
    const prepData = await runAutoPrepTask(
      buildLegacyPlannerWrappedInput(
        params.prepInput,
        params.liveDirectiveInput,
        params.intentMode
      ),
      `ingest-${params.fileName}`
    );
    prepTaskText = formatTaskResultText(prepData?.parsed, prepData?.raw);
    params.applyTaskUsage(prepData?.usage);

    const transformedPrep = await maybeTransformLegacyDisplayText({
      text: prepTaskText,
      intentInput: params.liveDirectiveInput,
      responseMode: params.responseMode,
    });
    prepTaskText = transformedPrep.text;
    params.applyTaskUsage(transformedPrep.usage);

    if (params.action === "inject_prep_deepen") {
      try {
        const deepenData = await runAutoDeepenTask(
          prepTaskText,
          `prep-${params.fileName}`
        );
        deepenTaskText = formatTaskResultText(
          deepenData?.parsed,
          deepenData?.raw
        );
        params.applyTaskUsage(deepenData?.usage);

        const transformedDeepen = await maybeTransformLegacyDisplayText({
          text: deepenTaskText,
          intentInput: params.liveDirectiveInput,
          responseMode: params.responseMode,
        });
        deepenTaskText = transformedDeepen.text;
        params.applyTaskUsage(transformedDeepen.usage);
      } catch (error) {
        console.error("auto deepen task failed", error);
        deepenTaskText = "ファイル内容の深掘りに失敗しました。";
      }
    }
  } catch (error) {
    console.error("auto prep task failed", error);
    prepTaskText = "抽出結果からの自動タスク形成に失敗しました。";
  }

  return { prepTaskText, deepenTaskText };
}

export function buildLegacyIngestSummaryMessage(params: {
  title: string;
  resolvedKind: UploadKind;
  readPolicy: FileReadPolicy;
  mode: IngestMode;
  detail: ImageDetail;
  action: PostIngestAction;
  blocksLength: number;
  directiveLines: string[];
  prepInput: string;
  prepTaskText: string;
  deepenTaskText: string;
}) {
  const modeLine =
    params.resolvedKind === "text"
      ? `テキスト読込: ${params.mode}`
      : `画像詳細度: ${params.detail}`;

  const messageParts = [
    "ファイルを Kin 注入用テキストへ変換しました。",
    `タイトル: ${params.title}`,
    `対象: ${params.resolvedKind === "text" ? "テキスト" : "画像 / PDF"}`,
    `読込方針: ${resolveLegacyIngestReadPolicyLabel(params.readPolicy)}`,
    modeLine,
    `注入後処理: ${resolveLegacyIngestActionLabel(params.action)}`,
    `分割数: ${params.blocksLength}`,
    params.directiveLines.length > 0
      ? `追加指示: ${params.directiveLines.join(" / ")}`
      : "",
    "",
    `Kin入力に 1/${params.blocksLength} をセットしました。送信後は次パートを続けて使えます。`,
  ].filter(Boolean);

  if (params.action === "inject_only") {
    messageParts.push("", "--------------------", "抽出テキスト", params.prepInput);
  }

  if (params.action !== "inject_only" && params.prepTaskText) {
    messageParts.push("", "--------------------", params.prepTaskText);
  }

  if (params.action === "inject_prep_deepen" && params.deepenTaskText) {
    messageParts.push(
      "",
      "====================",
      "深掘り結果",
      params.deepenTaskText
    );
  }

  return messageParts.join("\n");
}
