import type { Dispatch, SetStateAction } from "react";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  formatTaskResultText,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import { resolveIngestExtractionArtifacts } from "@/lib/app/fileIngestFlowBuilders";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingestClient";
import { resolveTaskName } from "@/lib/app/taskDraftHelpers";
import {
  buildAttachCurrentTaskDraftUpdate,
  buildAttachCurrentTaskMergedInput,
  buildPostIngestTaskDraftUpdate,
} from "@/lib/app/ingestTaskDraftUpdates";
import {
  buildLegacyIngestBlocksFromText,
  readLegacyDirectiveInputFallback,
} from "@/lib/app/legacyIngestHelpers";
import {
  buildLegacyIngestSummaryMessage,
  resolveLegacyIngestPostActionTexts,
} from "@/lib/app/legacyIngestFlowHelpers";
import {
  buildKinDirectiveLines,
  buildTaskExecutionInstruction,
  parseTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
} from "@/lib/app/transformIntent";
import type { Message } from "@/types/chat";
import type { TaskDraft } from "@/types/task";
import { generateId } from "@/lib/uuid";
import { normalizeUsage } from "@/lib/tokenStats";

type IngestOptions = {
  kind: UploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  action: PostIngestAction;
  readPolicy: FileReadPolicy;
  compactCharLimit: number;
  simpleImageCharLimit: number;
};

type UsageInput = Parameters<typeof normalizeUsage>[0];

type UseIngestActionsArgs = {
  ingestLoading: boolean;
  setIngestLoading: Dispatch<SetStateAction<boolean>>;
  uploadKind: UploadKind;
  setUploadKind: (kind: UploadKind) => void;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  fileReadPolicy: FileReadPolicy;
  currentTaskDraft: TaskDraft;
  setCurrentTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  gptMessages: Message[];
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  applyIngestUsage: (usage: UsageInput) => void;
  applyTaskUsage: (usage: UsageInput) => void;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setKinInput: (value: string) => void;
  isMobile: boolean;
  onSwitchToKin: () => void;
  getTaskBaseText: () => string;
  directiveInput?: string;
  setDirectiveInput?: (value: string) => void;
  responseMode?: ResponseMode;
};

function toTransformResponseMode(
  mode?: ResponseMode
): "strict" | "creative" | undefined {
  if (!mode) return undefined;
  return mode;
}

function appendLegacyIngestMessage(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  text: string,
  meta?: Message["meta"]
) {
  setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text,
      ...(meta ? { meta } : {}),
    },
  ]);
}

export function useIngestActions({
  ingestLoading,
  setIngestLoading,
  setUploadKind,
  currentTaskDraft,
  setCurrentTaskDraft,
  setGptMessages,
  applyIngestUsage,
  applyTaskUsage,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setKinInput,
  isMobile,
  onSwitchToKin,
  getTaskBaseText,
  directiveInput,
  setDirectiveInput,
  responseMode,
}: UseIngestActionsArgs) {
  const injectFileToKinDraft = async (file: File, options: IngestOptions) => {
    if (ingestLoading) return;

    setIngestLoading(true);

    try {
      const { response, data, resolvedKind } = await requestFileIngest({
        file,
        options,
      });

      if (!response.ok) {
        const errorText = resolveIngestErrorMessage({
          data,
          fallback: "ファイル読込に失敗しました。",
        });

        appendLegacyIngestMessage(
          setGptMessages,
          `${errorText}\n\n必要なら /api/ingest のレスポンス詳細を確認してください。`
        );
        return;
      }

      applyIngestUsage(data?.usage);

      const title = resolveIngestFileTitle({
        data,
        fallback: file.name,
      });
      const liveDirectiveInput =
        (directiveInput || "").trim() || readLegacyDirectiveInputFallback();
      const intent = parseTransformIntent(liveDirectiveInput, "sys_info");
      const { taskPrepEnvelopeBase } = resolveIngestExtractionArtifacts({
        data,
        fileName: file.name,
        fileTitle: title,
      });
      let prepInput = taskPrepEnvelopeBase;
      let effectiveContent = prepInput;

      if (shouldTransformContent(intent)) {
        try {
          const transformed = await transformTextWithIntent({
            text: prepInput,
            intent,
            responseMode: toTransformResponseMode(responseMode),
          });
          effectiveContent = transformed.text.trim() || prepInput;
          prepInput = effectiveContent;
          applyTaskUsage(transformed.usage);
        } catch (error) {
          console.error("file transform failed", error);
          appendLegacyIngestMessage(
            setGptMessages,
            "ファイル内容の変換に失敗したため、元の抽出結果で続行しました。",
            {
              kind: "task_info",
              sourceType: "file_ingest",
            }
          );
        }
      }

      const directiveLines = buildKinDirectiveLines(intent);
      const blocks: string[] =
        shouldTransformContent(intent) || directiveLines.length > 0
          ? buildLegacyIngestBlocksFromText({
              mode: intent.mode,
              taskSlot: 1,
              title: title || file.name,
              content: effectiveContent,
              directiveLines,
            })
          : Array.isArray(data?.kinBlocks)
            ? data.kinBlocks
            : [];

      if (blocks.length === 0) {
        appendLegacyIngestMessage(
          setGptMessages,
          "Kin送信用ブロックを生成できませんでした。"
        );
        return;
      }

      setPendingKinInjectionBlocks(blocks);
      setPendingKinInjectionIndex(0);
      setKinInput(blocks[0]);
      setUploadKind(resolvedKind);
      setDirectiveInput?.("");

      const { prepTaskText, deepenTaskText } =
        await resolveLegacyIngestPostActionTexts({
          action: options.action,
          prepInput,
          liveDirectiveInput,
          responseMode,
          fileName: file.name,
          intentMode: intent.mode,
          applyTaskUsage,
        });

      appendLegacyIngestMessage(
        setGptMessages,
        buildLegacyIngestSummaryMessage({
          title,
          resolvedKind,
          readPolicy: options.readPolicy,
          mode: options.mode,
          detail: options.detail,
          action: options.action,
          blocksLength: blocks.length,
          directiveLines,
          prepInput,
          prepTaskText,
          deepenTaskText,
        }),
        {
          kind: "task_info",
          sourceType: "file_ingest",
        }
      );

      if (options.action === "attach_to_current_task") {
        const currentTaskText = getTaskBaseText();

        if (!currentTaskText) {
          appendLegacyIngestMessage(
            setGptMessages,
            "現在タスクがないため、ファイルは読込のみ行いました。必要なら先にタスクを作成してください。"
          );
        } else {
          const mergedInput = buildAttachCurrentTaskMergedInput({
            currentTaskText,
            fileName: file.name,
            prepInput,
            currentTaskDraft: {
              ...currentTaskDraft,
              userInstruction: buildTaskExecutionInstruction(
                currentTaskDraft.userInstruction,
                intent
              ),
            },
            fileTitle: title || file.name,
            getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
              explicitTitle || fallback || "",
          });

          try {
            const mergeData = await runAutoPrepTask(
              mergedInput,
              `attach-${file.name}`
            );
            const mergedTaskText = formatTaskResultText(
              mergeData?.parsed,
              mergeData?.raw
            );
            applyTaskUsage(mergeData?.usage);

            appendLegacyIngestMessage(
              setGptMessages,
              ["現在タスクの更新結果", mergedTaskText].join("\n\n"),
              {
                kind: "task_prep",
                sourceType: "file_ingest",
              }
            );

            setCurrentTaskDraft((prev) =>
              buildAttachCurrentTaskDraftUpdate({
                previousDraft: prev,
                fileName: file.name,
                fileTitle: title || file.name,
                prepInput,
                mergedTaskText,
                resolveTaskTitleFromDraft: (draft, { explicitTitle, fallback }) =>
                  resolveTaskName(draft, explicitTitle || fallback || ""),
                objectiveFallback: `ファイル ${file.name} を統合したタスク`,
              })
            );
          } catch (error) {
            console.error("attach current task failed", error);
            appendLegacyIngestMessage(
              setGptMessages,
              "ファイル内容の現在タスクへの統合に失敗しました。"
            );
          }
        }
      }

      if (options.action === "inject_and_prep" && prepTaskText) {
        setCurrentTaskDraft((prev) =>
          buildPostIngestTaskDraftUpdate({
            previousDraft: prev,
            action: options.action,
            fileName: file.name,
            fileTitle: title || file.name,
            prepInput,
            prepTaskText,
            deepenTaskText,
            getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
              explicitTitle || fallback || "",
            objectiveBuilder: (name) => `ファイル ${name} から形成したタスク`,
          })
        );
      }

      if (options.action === "inject_prep_deepen") {
        const finalText = deepenTaskText || prepTaskText;
        if (finalText) {
          setCurrentTaskDraft((prev) =>
            buildPostIngestTaskDraftUpdate({
              previousDraft: prev,
              action: options.action,
              fileName: file.name,
              fileTitle: title || file.name,
              prepInput,
              prepTaskText,
              deepenTaskText,
              getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
                explicitTitle || fallback || "",
              objectiveBuilder: (name) => `ファイル ${name} から形成したタスク`,
            })
          );
        }
      }

      if (isMobile) {
        onSwitchToKin();
      }
    } catch (error) {
      console.error(error);
      appendLegacyIngestMessage(
        setGptMessages,
        "ファイル読込中にエラーが発生しました。"
      );
    } finally {
      setIngestLoading(false);
    }
  };

  return {
    injectFileToKinDraft,
  };
}
