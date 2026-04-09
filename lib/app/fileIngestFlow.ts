import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import {
  buildPrepInputFromIngestResult,
  buildMergedTaskInput,
  formatTaskResultText,
  resolveUploadKindFromFile,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from "@/lib/app/kinStructuredProtocol";
import {
  buildKinDirectiveLines,
  splitTextIntoKinChunks,
} from "@/lib/app/transformIntent";
import { createTaskSource } from "@/lib/app/taskDraftHelpers";
import { normalizeUsage } from "@/lib/tokenStats";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { Message } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import type { TransformIntent } from "@/lib/app/transformIntent";

type IngestResult = {
  result?: {
    title?: string;
    selectedLines?: unknown[];
    rawText?: string;
  };
  usage?: Parameters<typeof normalizeUsage>[0];
  error?: string;
};

type IngestFlowArgs = {
  file: File;
  options: {
    kind: UploadKind;
    mode: IngestMode;
    detail: ImageDetail;
    action: PostIngestAction;
    readPolicy: FileReadPolicy;
    compactCharLimit: number;
    simpleImageCharLimit: number;
  };
  ingestLoading: boolean;
  responseMode: ResponseMode;
  gptInput: string;
  currentTaskDraft: TaskDraft;
  gptStateRef: MutableRefObject<any>;
  chatRecentLimit: number;
  setIngestLoading: Dispatch<SetStateAction<boolean>>;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setUploadKind: Dispatch<SetStateAction<UploadKind>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptState: Dispatch<SetStateAction<any>>;
  setCurrentTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    createdAt: string;
    updatedAt: string;
  }) => unknown;
  resolveTransformIntent: (args: {
    input: string;
    defaultMode: "sys_info" | "sys_task";
    responseMode: "strict" | "creative";
  }) => Promise<{ intent: TransformIntent; usage?: Parameters<typeof normalizeUsage>[0] }>;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    responseMode: "strict" | "creative";
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  getTaskBaseText: () => string;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  resolveTaskTitleFromDraft: (
    draft: TaskDraft,
    params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }
  ) => string;
  setActiveTabToKin?: () => void;
};

function appendMessage(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  message: Message
) {
  setGptMessages((prev) => [...prev, message]);
}

function appendInfo(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  text: string,
  sourceType: Message["meta"] extends infer M
    ? M extends { sourceType?: infer S }
      ? S
      : never
    : never = "file_ingest"
) {
  appendMessage(setGptMessages, {
    id: generateId(),
    role: "gpt",
    text,
    meta: {
      kind: "task_info",
      sourceType: sourceType as any,
    },
  });
}

function buildStoredDocumentSummary(text: string, fallbackTitle: string) {
  const trimmed = text.trim();
  if (!trimmed) return fallbackTitle;
  const normalized = trimmed.replace(/\s+/g, " ").trim();
  const withoutTitle = normalized.startsWith(fallbackTitle)
    ? normalized.slice(fallbackTitle.length).trimStart()
    : normalized;
  const basis = withoutTitle || normalized;
  const sentenceParts = basis
    .split(/(?<=[。．.!?！？])/)
    .map((part) => part.trim())
    .filter(Boolean);
  const summary = (sentenceParts.slice(0, 2).join(" ") || basis).trim();
  return summary.length > 220 ? `${summary.slice(0, 220).trimEnd()}...` : summary;
}

export async function runFileIngestFlow({
  file,
  options,
  ingestLoading,
  responseMode,
  gptInput,
  currentTaskDraft,
  gptStateRef,
  chatRecentLimit,
  setIngestLoading,
  setGptMessages,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setKinInput,
  setUploadKind,
  setGptInput,
  setGptState,
  setCurrentTaskDraft,
  applyIngestUsage,
  applyTaskUsage,
  recordIngestedDocument,
  resolveTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
  getTaskBaseText,
  getResolvedTaskTitle,
  resolveTaskTitleFromDraft,
  setActiveTabToKin,
}: IngestFlowArgs) {
  if (ingestLoading) return;

  const resolvedKind = resolveUploadKindFromFile(file, options.kind);
  setIngestLoading(true);

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", resolvedKind);
    form.append("mode", options.mode);
    form.append("detail", options.detail);
    form.append("readPolicy", options.readPolicy);
    form.append("compactCharLimit", String(options.compactCharLimit));
    form.append("simpleImageCharLimit", String(options.simpleImageCharLimit));

    const res = await fetch("/api/ingest", {
      method: "POST",
      body: form,
    });

    const data = (await res.json()) as IngestResult;
    if (!res.ok) {
      appendInfo(
        setGptMessages,
        `${typeof data?.error === "string" ? data.error : "File ingest failed."}\n\nPlease also check the /api/ingest response details.`
      );
      return;
    }

    const fileTitle =
      typeof data?.result?.title === "string" && data.result.title.trim()
        ? data.result.title.trim()
        : file.name;

    applyIngestUsage(data?.usage);

    const selectedLines = Array.isArray(data?.result?.selectedLines)
      ? data.result.selectedLines.filter(
          (line: unknown): line is string => typeof line === "string" && line.trim().length > 0
        )
      : [];
    const selectedText = selectedLines.join("\n").trim();
    const selectedCharCount = selectedText.length;
    const rawIngestText =
      typeof data?.result?.rawText === "string" ? data.result.rawText.trim() : "";
    const rawCharCount = rawIngestText.length;

    const prepInputBase =
      selectedLines.length > 0
        ? [
            `File: ${file.name}`,
            `Title: ${fileTitle}`,
            `Content:\n${selectedLines.join("\n")}`,
          ].join("\n\n")
        : buildPrepInputFromIngestResult(data, file.name);
    let prepInput = prepInputBase;

    const directiveText = gptInput.trim();
    const { intent, usage } = await resolveTransformIntent({
      input: directiveText,
      defaultMode: "sys_info",
      responseMode: responseMode === "creative" ? "creative" : "strict",
    });
    applyTaskUsage(usage);

    if (shouldTransformContent(intent)) {
      try {
        const transformed = await transformTextWithIntent({
          text: prepInputBase,
          intent,
          responseMode: responseMode === "creative" ? "creative" : "strict",
        });
        prepInput = transformed.text.trim() || prepInputBase;
        applyTaskUsage(transformed.usage);
      } catch (error) {
        console.error("file transform failed", error);
        appendInfo(
          setGptMessages,
          "Transforming the ingested file content failed. Continuing with the original extracted content."
        );
      }
    }

    const directiveLines = buildKinDirectiveLines(intent);
    const chunks = splitTextIntoKinChunks(prepInput, 3400, 260);
    const blocks = chunks.map((chunk, index) =>
      intent.mode === "sys_task"
        ? buildKinSysTaskBlock({
            taskSlot: currentTaskDraft.slot,
            title: fileTitle,
            content: chunk,
            directiveLines,
          })
        : buildKinSysInfoBlock({
            taskSlot: currentTaskDraft.slot,
            title: fileTitle,
            sourceLabel: "file_ingest",
            content: chunk,
            directiveLines,
            partIndex: index + 1,
            partTotal: chunks.length,
          })
    );

    if (blocks.length === 0) {
      appendInfo(setGptMessages, "No Kin injection blocks could be created.");
      return;
    }

    setPendingKinInjectionBlocks(blocks);
    setPendingKinInjectionIndex(0);
    setKinInput(blocks[0]);
    setUploadKind(resolvedKind);
    setGptInput("");

    let prepTaskText = "";
    let deepenTaskText = "";

    if (options.action === "inject_and_prep" || options.action === "inject_prep_deepen") {
      try {
        const prepData = await runAutoPrepTask(prepInput, `ingest-${file.name}`);
        prepTaskText = formatTaskResultText(prepData?.parsed, prepData?.raw);
        applyTaskUsage(prepData?.usage);

        if (options.action === "inject_prep_deepen") {
          try {
            const deepenData = await runAutoDeepenTask(prepTaskText, `prep-${file.name}`);
            deepenTaskText = formatTaskResultText(deepenData?.parsed, deepenData?.raw);
            applyTaskUsage(deepenData?.usage);
          } catch (error) {
            console.error("auto deepen task failed", error);
            deepenTaskText = "Auto deepen failed.";
          }
        }
      } catch (error) {
        console.error("auto prep task failed", error);
        prepTaskText = "Auto prep failed.";
      }
    }

    const actionLabel =
      options.action === "inject_only"
        ? "Inject only"
        : options.action === "inject_and_prep"
          ? "Inject + prep"
          : options.action === "inject_prep_deepen"
            ? "Inject + prep + deepen"
            : "Attach to current task";

    const summaryParts = [
      "File converted into Kin-ready text.",
      `Title: ${fileTitle}`,
      `Target: ${resolvedKind === "text" ? "Text" : "Image / PDF"}`,
      `Read policy: ${options.readPolicy}`,
      `${resolvedKind === "text" ? "Text ingest" : "Image detail"}: ${resolvedKind === "text" ? options.mode : options.detail}`,
      `Post-ingest action: ${actionLabel}`,
      `Injection characters: ${prepInput.length.toLocaleString()}`,
      `Extracted characters: ${selectedCharCount.toLocaleString()}`,
      ...(rawCharCount > 0 && rawCharCount !== selectedCharCount
        ? [`Raw characters: ${rawCharCount.toLocaleString()}`]
        : []),
      `Blocks: ${blocks.length}`,
      "",
      `Set block 1/${blocks.length} to Kin input. After sending, the next part will be queued automatically.`,
    ];

    if (options.action === "inject_only") {
      summaryParts.push("", "--------------------", prepInput);
    }
    if (options.action !== "inject_only" && prepTaskText) {
      summaryParts.push("", "--------------------", prepTaskText);
    }
    if (options.action === "inject_prep_deepen" && deepenTaskText) {
      summaryParts.push("", "====================", "Deepened task result", deepenTaskText);
    }

    appendInfo(setGptMessages, summaryParts.join("\n"));

    const documentCreatedAt = new Date().toISOString();
    recordIngestedDocument({
      title: fileTitle,
      filename: file.name,
      text: prepInput,
      summary: buildStoredDocumentSummary(prepInput, fileTitle),
      taskId: currentTaskDraft.id || undefined,
      charCount: prepInput.length,
      createdAt: documentCreatedAt,
      updatedAt: documentCreatedAt,
    });

    const chatContextBody = selectedText || prepInput.trim();
    const chatContextExcerpt =
      chatContextBody.length > 1600
        ? `${chatContextBody.slice(0, 1600).trimEnd()}...`
        : chatContextBody;

    const fileContextMessage: Message = {
      id: generateId(),
      role: "gpt",
      text: [
        "[Ingested file context]",
        `File: ${file.name}`,
        `Title: ${fileTitle}`,
        `Target: ${resolvedKind === "text" ? "Text" : "Image / PDF"}`,
        `Extracted characters: ${selectedCharCount.toLocaleString()}`,
        chatContextExcerpt ? `Content:\n${chatContextExcerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      meta: {
        kind: "task_info",
        sourceType: "file_ingest",
      },
    };

    const currentGptState = gptStateRef.current;
    const recentWithoutPriorFileBridge = (currentGptState.recentMessages || []).filter(
      (message: Message) =>
        !(
          message.meta?.sourceType === "file_ingest" &&
          message.meta?.kind === "task_info"
        )
    );
    const nextGptState = {
      ...currentGptState,
      memory: {
        ...currentGptState.memory,
        lists: {
          ...currentGptState.memory?.lists,
          activeDocument: {
            title: fileTitle,
            fileName: file.name,
            kind: resolvedKind,
            charCount: selectedCharCount,
            rawCharCount,
            excerpt: chatContextExcerpt,
            injectedAt: new Date().toISOString(),
          },
        },
        context: {
          ...currentGptState.memory?.context,
          currentTopic: fileTitle,
          followUpRule: `If the user says "this" or asks about the uploaded file, treat it as referring to ${fileTitle}.`,
          lastUserIntent: `Ingested file ${file.name}`,
        },
      },
      recentMessages: [...recentWithoutPriorFileBridge, fileContextMessage].slice(
        -chatRecentLimit
      ),
    };

    setGptState(nextGptState);
    gptStateRef.current = nextGptState;

    if (options.action === "inject_only") {
      setActiveTabToKin?.();
      return;
    }

    if (options.action === "attach_to_current_task") {
      const currentTaskText = getTaskBaseText();

      if (!currentTaskText) {
        appendInfo(
          setGptMessages,
          "No current task exists, so the file was only injected. Create or open a task first to attach it."
        );
      } else {
        const mergedInput = buildMergedTaskInput(currentTaskText, `FILE: ${file.name}`, prepInput, {
          title: getResolvedTaskTitle({
            explicitTitle: currentTaskDraft.title || fileTitle,
            freeText: prepInput,
            fallback: file.name,
          }),
          userInstruction: currentTaskDraft.userInstruction,
          searchRawText: currentTaskDraft.searchContext?.rawText || "",
        });

        try {
          const mergeData = await runAutoPrepTask(mergedInput, `attach-${file.name}`);
          const mergedTaskText = formatTaskResultText(mergeData?.parsed, mergeData?.raw);
          applyTaskUsage(mergeData?.usage);

          appendMessage(setGptMessages, {
            id: generateId(),
            role: "gpt",
            text: ["Current task updated with file content.", mergedTaskText].join("\n\n"),
            meta: {
              kind: "task_prep",
              sourceType: "file_ingest",
            },
          });

          const source = createTaskSource("file_ingest", `FILE: ${file.name}`, prepInput);
          setCurrentTaskDraft((prev) => {
            const nextTitle = resolveTaskTitleFromDraft(prev, {
              explicitTitle: prev.title || fileTitle,
              freeText: prepInput,
              fallback: file.name,
            });
            return {
              ...prev,
              taskName: nextTitle,
              title: nextTitle,
              body: mergedTaskText,
              objective: prev.objective || `Attached file ${file.name}`,
              deepenText: "",
              mergedText: mergedTaskText,
              kinTaskText: "",
              status: "prepared",
              sources: [...prev.sources, source],
              updatedAt: new Date().toISOString(),
            };
          });
        } catch (error) {
          console.error("attach current task failed", error);
          appendInfo(setGptMessages, "Attaching the file to the current task failed.");
        }
      }
    }

    const source = createTaskSource("file_ingest", `FILE: ${file.name}`, prepInput);

    if (options.action === "inject_and_prep" && prepTaskText) {
      setCurrentTaskDraft((prev) => ({
        ...prev,
        taskName: getResolvedTaskTitle({
          explicitTitle: fileTitle,
          freeText: prepInput,
          fallback: file.name,
        }),
        title: getResolvedTaskTitle({
          explicitTitle: fileTitle,
          freeText: prepInput,
          fallback: file.name,
        }),
        body: prepTaskText,
        objective: `Prepared from file ${file.name}`,
        prepText: prepTaskText,
        deepenText: "",
        mergedText: prepTaskText,
        kinTaskText: "",
        status: "prepared",
        sources: [...prev.sources, source],
        updatedAt: new Date().toISOString(),
      }));
    }

    if (options.action === "inject_prep_deepen") {
      const finalText = deepenTaskText || prepTaskText;
      if (finalText) {
        setCurrentTaskDraft((prev) => ({
          ...prev,
          taskName: getResolvedTaskTitle({
            explicitTitle: fileTitle,
            freeText: finalText,
            fallback: file.name,
          }),
          title: getResolvedTaskTitle({
            explicitTitle: fileTitle,
            freeText: finalText,
            fallback: file.name,
          }),
          body: finalText,
          objective: `Prepared from file ${file.name}`,
          prepText: prepTaskText,
          deepenText: deepenTaskText,
          mergedText: finalText,
          kinTaskText: "",
          status: deepenTaskText ? "deepened" : "prepared",
          sources: [...prev.sources, source],
          updatedAt: new Date().toISOString(),
        }));
      }
    }

    setActiveTabToKin?.();
  } catch (error) {
    console.error(error);
    appendInfo(setGptMessages, "File ingest failed.");
  } finally {
    setIngestLoading(false);
  }
}
