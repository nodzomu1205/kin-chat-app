import type React from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import type {
  DocumentReferenceMode,
  GptInstructionMode,
  PostIngestAction,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/taskIntent";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import { normalizeUsage } from "@/lib/tokenStats";
import { runSendToGptFlow } from "@/lib/app/sendToGptFlow";
import { runSendKinMessageFlow } from "@/lib/app/sendToKinFlow";
import {
  receiveLastKinResponseFlow,
  runStartKinTaskFlow,
} from "@/lib/app/kinTaskFlow";
import {
  runAttachSearchResultToTaskFlow,
  runDeepenTaskFromLastFlow,
  runPrepTaskFromInputFlow,
  runUpdateTaskFromInputFlow,
  runUpdateTaskFromLastGptMessageFlow,
} from "@/lib/app/taskDraftActionFlows";
import {
  sendCurrentTaskContentToKinFlow,
  sendLatestGptContentToKinFlow,
} from "@/lib/app/kinTransferFlows";
import { runFileIngestFlow } from "@/lib/app/fileIngestFlow";
import {
  approveIntentCandidateFlow,
  prepareTaskRequestAckFlow,
  prepareTaskSyncFlow,
  rejectIntentCandidateFlow,
  resetProtocolDefaultsFlow,
  saveProtocolDefaultsFlow,
  sendProtocolRulebookToKinFlow,
  setProtocolRulebookToKinDraftFlow,
} from "@/lib/app/miscUiFlows";
import {
  looksLikeTaskInstruction,
  resolveTaskIntentWithFallback,
} from "@/lib/taskIntent";
import {
  buildLimitExceededBlock,
  extractTaskProtocolEvents,
} from "@/lib/taskRuntimeProtocol";
import { shouldInjectTaskContext } from "@/lib/taskChatBridge";
import {
  extractPreferredKinTransferText,
} from "@/lib/app/kinStructuredProtocol";
import {
  resolveTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
} from "@/lib/app/transformIntent";
import {
  buildPendingIntentCandidateKey,
  extractTaskGoalFromSysTaskBlock,
  getIntentCandidateSignature,
  toTransformResponseMode,
} from "@/lib/app/chatPageHelpers";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import type { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";

type TaskProtocolController = ReturnType<typeof useKinTaskProtocol>;

type UseChatPageActionsArgs = {
  gptInput: string;
  kinInput: string;
  gptLoading: boolean;
  kinLoading: boolean;
  ingestLoading: boolean;
  currentKin: string | null;
  kinList: Array<{ id: string; label: string }>;
  currentTaskDraft: TaskDraft;
  currentTaskIntentConstraints: string[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  rejectedIntentCandidateSignatures: string[];
  pendingIntentCandidates: PendingIntentCandidate[];
  protocolPrompt: string;
  protocolRulebook: string;
  responseMode: ResponseMode;
  chatBridgeSettings: ChatBridgeSettings;
  gptMessages: Message[];
  kinMessages: Message[];
  gptState: any;
  gptStateRef: React.MutableRefObject<any>;
  lastSearchContext: SearchContext | null;
  pendingKinInjectionBlocks: string[];
  pendingKinInjectionIndex: number;
  isMobile: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
  taskProtocol: TaskProtocolController;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  setKinMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setKinLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setGptLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingKinInjectionBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingKinInjectionIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  setGptState: React.Dispatch<React.SetStateAction<any>>;
  setUploadKind: React.Dispatch<React.SetStateAction<any>>;
  setPendingIntentCandidates: React.Dispatch<
    React.SetStateAction<PendingIntentCandidate[]>
  >;
  setApprovedIntentPhrases: React.Dispatch<
    React.SetStateAction<ApprovedIntentPhrase[]>
  >;
  setRejectedIntentCandidateSignatures: React.Dispatch<
    React.SetStateAction<string[]>
  >;
  setProtocolPrompt: React.Dispatch<React.SetStateAction<string>>;
  setProtocolRulebook: React.Dispatch<React.SetStateAction<string>>;
  setKinConnectionState: React.Dispatch<
    React.SetStateAction<"idle" | "connected" | "error">
  >;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  recordSearchContext: (ctx: {
    taskId?: string;
    actionId?: string;
    query: string;
    goal?: string;
    outputMode?: "summary" | "raw_and_summary";
    summaryText?: string;
    rawText: string;
    sources: { title: string; link: string }[];
  }) => SearchContext;
  applySearchUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyChatUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyTaskUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyIngestUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  getProvisionalMemory: (
    inputText: string,
    options?: {
      currentTaskTitle?: string;
      activeDocumentTitle?: string;
      lastSearchQuery?: string;
    }
  ) => any;
  handleGptMemory: (
    recent: Message[]
  ) => Promise<{ summaryUsage: Parameters<typeof normalizeUsage>[0] | null }>;
  chatRecentLimit: number;
  buildSearchReferenceContext: () => string;
  buildDocumentReferenceContext: () => string;
  buildLibraryReferenceContext: () => string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  recordIngestedDocument: (document: Omit<StoredDocument, "id" | "sourceType">) => StoredDocument;
  getTaskBaseText: () => string;
  getTaskLibraryItem: () => ReferenceLibraryItem | null;
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
  getTaskSlotLabel: () => string;
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
  }) => void;
  applyPrefixedTaskFieldsFromText: (text: string) => any;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  resetCurrentTaskDraft: () => void;
  updateMemorySettings: (next: any) => void;
  resetMemorySettings: () => void;
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  clearSearchHistory: () => void;
  promptDefaultKey: string;
  rulebookDefaultKey: string;
};

export function useChatPageActions(args: UseChatPageActionsArgs) {
  const currentKinProfile =
    args.kinList.find((kin) => kin.id === args.currentKin) ?? null;
  const currentKinLabel = currentKinProfile?.label ?? null;

  const clearPendingKinInjection = () => {
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
  };

  const runStartKinTaskFromInput = async () => {
    await runStartKinTaskFlow({
      rawInput: args.gptInput,
      approvedIntentPhrases: args.approvedIntentPhrases,
      responseMode: args.responseMode === "creative" ? "creative" : "strict",
      resolveIntent: resolveTaskIntentWithFallback,
      applyTaskUsage: args.applyTaskUsage,
      mergePendingIntentCandidates: (candidates) => {
        args.setPendingIntentCandidates((prev) => {
          const rejected = new Set(args.rejectedIntentCandidateSignatures);
          const existingKeys = new Set(
            prev.map((item) => buildPendingIntentCandidateKey(item))
          );
          const additions = candidates.filter((item) => {
            const key = buildPendingIntentCandidateKey(item);
            const signature = getIntentCandidateSignature(item);
            return !existingKeys.has(key) && !rejected.has(signature);
          });
          return additions.length > 0 ? [...additions, ...prev].slice(0, 50) : prev;
        });
      },
      startTask: args.taskProtocol.startTask,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      setKinInput: args.setKinInput,
      setGptInput: args.setGptInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
      extractTaskGoalFromSysTaskBlock,
    });
  };

  const sendKinMessage = async (text: string) => {
    await runSendKinMessageFlow({
      text,
      currentKin: args.currentKin,
      kinLoading: args.kinLoading,
      setKinConnectionState: args.setKinConnectionState,
      setKinLoading: args.setKinLoading,
      pendingKinInjectionBlocks: args.pendingKinInjectionBlocks,
      pendingKinInjectionIndex: args.pendingKinInjectionIndex,
      setKinMessages: args.setKinMessages,
      setKinInput: args.setKinInput,
      ingestProtocolMessage: args.ingestProtocolMessage,
      processMultipartTaskDoneText: (replyText) =>
        args.processMultipartTaskDoneText(replyText),
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      clearPendingKinInjection,
    });
  };

  const sendToKin = async () => {
    await sendKinMessage(args.kinInput.trim());
  };

  const parseWrappedSearchResponse = (text: string) => {
    const event = extractTaskProtocolEvents(text).find(
      (candidate) => candidate.type === "search_response"
    );
    if (!event) return null;

    const rawExcerptMatch = text.match(
      /RAW_EXCERPT:\s*([\s\S]*?)<<END_SYS_SEARCH_RESPONSE>>/
    );

    return {
      query: event.query,
      outputMode: event.outputMode,
      summary: event.summary || event.body || "",
      rawResultId: event.rawResultId,
      rawExcerpt: rawExcerptMatch?.[1]?.trim() || "",
    };
  };

  const getProtocolLimitViolation = (event: {
    type: "ask_gpt" | "search_request" | "user_question" | "library_reference";
    taskId?: string;
    actionId?: string;
  }) => {
    const kind =
      event.type === "ask_gpt"
        ? "ask_gpt"
        : event.type === "search_request"
          ? "search_request"
          : event.type === "library_reference"
            ? "library_reference"
            : "ask_user";
    const requirement = args.taskProtocol.runtime.requirementProgress.find(
      (item) => item.kind === kind
    );
    if (!requirement || typeof requirement.targetCount !== "number") return null;
    if ((requirement.completedCount ?? 0) <= requirement.targetCount) return null;

    const label =
      kind === "ask_gpt"
        ? "GPT request"
        : kind === "search_request"
          ? "web search request"
          : kind === "library_reference"
            ? "library reference request"
          : "user question";

    return buildLimitExceededBlock({
      taskId: event.taskId || args.taskProtocol.runtime.currentTaskId || "",
      actionId: event.actionId,
      summary: `This ${label} exceeds the allowed limit for the current task, so do not continue with it.`,
    });
  };

  const sendToGpt = async (instructionMode: GptInstructionMode = "normal") => {
    await runSendToGptFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      processMultipartTaskDoneText: args.processMultipartTaskDoneText,
      taskProtocolRuntime: args.taskProtocol.runtime,
      findPendingRequest: (requestId) =>
        args.taskProtocol.runtime.pendingRequests.find(
          (item) => item.id === requestId || item.actionId === requestId
        ) || null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      buildSearchReferenceContext: args.buildSearchReferenceContext,
      buildDocumentReferenceContext: args.buildDocumentReferenceContext,
      buildLibraryReferenceContext: args.buildLibraryReferenceContext,
      referenceLibraryItems: args.referenceLibraryItems,
      libraryIndexResponseCount: args.libraryIndexResponseCount,
      getProtocolLimitViolation,
      shouldInjectTaskContextWithSettings: (userInput) =>
        shouldInjectTaskContext({
          userInput,
          settings: args.chatBridgeSettings,
        }),
      parseWrappedSearchResponse,
      getProvisionalMemory: args.getProvisionalMemory,
      currentTaskTitle:
        args.currentTaskDraft.title?.trim() ||
        args.currentTaskDraft.taskName?.trim() ||
        undefined,
      activeDocumentTitle:
        typeof (args.gptState.memory as { lists?: Record<string, unknown> } | undefined)
          ?.lists?.activeDocument === "object" &&
        (((args.gptState.memory as { lists?: Record<string, unknown> } | undefined)
          ?.lists?.activeDocument as Record<string, unknown>)?.title)
          ? String(
              ((args.gptState.memory as { lists?: Record<string, unknown> } | undefined)
                ?.lists?.activeDocument as Record<string, unknown>).title
            )
          : undefined,
      lastSearchQuery: args.lastSearchContext?.query,
      handleGptMemory: args.handleGptMemory,
      chatRecentLimit: args.chatRecentLimit,
      gptStateRef: args.gptStateRef,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      instructionMode,
      responseMode: args.responseMode,
      currentTaskId: args.taskProtocol.runtime.currentTaskId,
      taskProtocolAnswerPendingRequest: args.taskProtocol.answerPendingRequest,
      ingestProtocolMessage: args.ingestProtocolMessage,
      recordSearchContext: args.recordSearchContext,
      applySearchUsage: args.applySearchUsage,
      applyChatUsage: args.applyChatUsage,
      applySummaryUsage: args.applySummaryUsage,
    });
  };

  const runPrepTaskFromInput = async () => {
    await runPrepTaskFromInputFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: () =>
        args.getTaskLibraryItem()?.itemType === "search" && args.lastSearchContext
          ? args.lastSearchContext
          : null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runUpdateTaskFromInput = async () => {
    await runUpdateTaskFromInputFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: () =>
        args.getTaskLibraryItem()?.itemType === "search" && args.lastSearchContext
          ? args.lastSearchContext
          : null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runUpdateTaskFromLastGptMessage = async () => {
    await runUpdateTaskFromLastGptMessageFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      gptMessages: args.gptMessages,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: () =>
        args.getTaskLibraryItem()?.itemType === "search" && args.lastSearchContext
          ? args.lastSearchContext
          : null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runAttachSearchResultToTask = async () => {
    await runAttachSearchResultToTaskFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      lastSearchContext: args.lastSearchContext,
      getTaskLibraryItem: args.getTaskLibraryItem,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: () =>
        args.getTaskLibraryItem()?.itemType === "search" && args.lastSearchContext
          ? args.lastSearchContext
          : null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runDeepenTaskFromLast = async () => {
    await runDeepenTaskFromLastFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: () =>
        args.getTaskLibraryItem()?.itemType === "search" && args.lastSearchContext
          ? args.lastSearchContext
          : null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const sendLastKinToGptDraft = () => {
    const last = [...args.kinMessages].reverse().find((m) => m.role === "kin");
    if (!last) return;

    args.setGptInput(extractPreferredKinTransferText(last.text));
    if (args.isMobile) args.setActiveTab("gpt");
  };

  const sendLastGptToKinDraft = () => {
    const last = [...args.gptMessages].reverse().find((m) => m.role === "gpt");
    if (!last) return;

    args.setKinInput(last.text);
    if (args.isMobile) args.setActiveTab("kin");
  };

  const sendLatestGptContentToKin = async () => {
    await sendLatestGptContentToKinFlow({
      gptMessages: args.gptMessages,
      gptInput: args.gptInput,
      currentTaskSlot: args.currentTaskDraft.slot,
      currentTaskTitle: args.currentTaskDraft.title,
      approvedIntentPhrases: args.approvedIntentPhrases,
      resolveTransformIntent: ({ input, defaultMode, responseMode }) =>
        resolveTransformIntent({ input, defaultMode, responseMode }),
      resolveTaskIntent: resolveTaskIntentWithFallback,
      mergePendingIntentCandidates: (candidates) => {
        args.setPendingIntentCandidates((prev) => {
          const rejected = new Set(args.rejectedIntentCandidateSignatures);
          const existingKeys = new Set(
            prev.map((item) => buildPendingIntentCandidateKey(item))
          );
          const additions = candidates.filter((item) => {
            const key = buildPendingIntentCandidateKey(item);
            const signature = getIntentCandidateSignature(item);
            return !existingKeys.has(key) && !rejected.has(signature);
          });
          return additions.length > 0 ? [...additions, ...prev].slice(0, 50) : prev;
        });
      },
      startTask: args.taskProtocol.startTask,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      responseMode: toTransformResponseMode(args.responseMode),
      applyTaskUsage: args.applyTaskUsage,
      shouldTransformContent,
      transformTextWithIntent: ({ text, intent, responseMode }) =>
        transformTextWithIntent({ text, intent, responseMode }),
      setGptLoading: args.setGptLoading,
      setGptMessages: args.setGptMessages,
      setKinInput: args.setKinInput,
      setGptInput: args.setGptInput,
      getTaskSlotLabel: args.getTaskSlotLabel,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const sendCurrentTaskContentToKin = async () => {
    await sendCurrentTaskContentToKinFlow({
      gptInput: args.gptInput,
      getTaskBaseText: args.getTaskBaseText,
      currentTaskSlot: args.currentTaskDraft.slot,
      currentTaskTitle: args.currentTaskDraft.title,
      currentTaskInstruction: args.currentTaskDraft.userInstruction,
      approvedIntentPhrases: args.approvedIntentPhrases,
      looksLikeTaskInstruction,
      runStartKinTaskFromInput,
      resolveTransformIntent: ({ input, defaultMode, responseMode }) =>
        resolveTransformIntent({ input, defaultMode, responseMode }),
      resolveTaskIntent: resolveTaskIntentWithFallback,
      mergePendingIntentCandidates: (candidates) => {
        args.setPendingIntentCandidates((prev) => {
          const rejected = new Set(args.rejectedIntentCandidateSignatures);
          const existingKeys = new Set(
            prev.map((item) => buildPendingIntentCandidateKey(item))
          );
          const additions = candidates.filter((item) => {
            const key = buildPendingIntentCandidateKey(item);
            const signature = getIntentCandidateSignature(item);
            return !existingKeys.has(key) && !rejected.has(signature);
          });
          return additions.length > 0 ? [...additions, ...prev].slice(0, 50) : prev;
        });
      },
      startTask: args.taskProtocol.startTask,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      responseMode: toTransformResponseMode(args.responseMode),
      applyTaskUsage: args.applyTaskUsage,
      shouldTransformContent,
      transformTextWithIntent: ({ text, intent, responseMode }) =>
        transformTextWithIntent({ text, intent, responseMode }),
      setGptLoading: args.setGptLoading,
      setGptMessages: args.setGptMessages,
      setKinInput: args.setKinInput,
      setGptInput: args.setGptInput,
      getTaskSlotLabel: args.getTaskSlotLabel,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const receiveLastKinResponseToGptInput = () => {
    receiveLastKinResponseFlow({
      kinMessages: args.kinMessages,
      processMultipartTaskDoneText: args.processMultipartTaskDoneText,
      setGptInput: args.setGptInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
      setActiveTabToGpt: args.isMobile ? () => args.setActiveTab("gpt") : undefined,
    });
  };

  const injectFileToKinDraft = async (
    file: File,
    options: {
      kind: any;
      mode: any;
      detail: any;
      action: PostIngestAction;
      readPolicy: any;
      compactCharLimit: number;
      simpleImageCharLimit: number;
    }
  ) => {
    await runFileIngestFlow({
      file,
      options,
      ingestLoading: args.ingestLoading,
      responseMode: args.responseMode,
      gptInput: args.gptInput,
      currentTaskDraft: args.currentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      setIngestLoading: args.setIngestLoading,
      setGptMessages: args.setGptMessages,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
      setUploadKind: args.setUploadKind,
      setGptInput: args.setGptInput,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      applyIngestUsage: args.applyIngestUsage,
      applyTaskUsage: args.applyTaskUsage,
      recordIngestedDocument: args.recordIngestedDocument,
      resolveTransformIntent: ({ input, defaultMode, responseMode }) =>
        resolveTransformIntent({ input, defaultMode, responseMode }),
      shouldTransformContent,
      transformTextWithIntent: ({ text, intent, responseMode }) =>
        transformTextWithIntent({ text, intent, responseMode }),
      getTaskBaseText: args.getTaskBaseText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      resolveTaskTitleFromDraft: args.resolveTaskTitleFromDraft,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const prepareTaskRequestAck = (requestId: string) => {
    prepareTaskRequestAckFlow({
      requestId,
      prepareWaitingAckMessage: args.taskProtocol.prepareWaitingAckMessage,
      setKinInput: args.setKinInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const prepareTaskSync = (note: string) => {
    prepareTaskSyncFlow({
      note,
      prepareTaskSyncMessage: args.taskProtocol.prepareTaskSyncMessage,
      setKinInput: args.setKinInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const resetProtocolDefaults = () => {
    resetProtocolDefaultsFlow({
      promptDefaultKey: args.promptDefaultKey,
      rulebookDefaultKey: args.rulebookDefaultKey,
      setProtocolPrompt: args.setProtocolPrompt,
      setProtocolRulebook: args.setProtocolRulebook,
    });
  };

  const saveProtocolDefaults = () => {
    saveProtocolDefaultsFlow({
      protocolPrompt: args.protocolPrompt,
      protocolRulebook: args.protocolRulebook,
      promptDefaultKey: args.promptDefaultKey,
      rulebookDefaultKey: args.rulebookDefaultKey,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
    });
  };

  const approveIntentCandidate = (candidateId: string) => {
    approveIntentCandidateFlow({
      candidateId,
      pendingIntentCandidates: args.pendingIntentCandidates,
      setApprovedIntentPhrases: args.setApprovedIntentPhrases,
      setPendingIntentCandidates: args.setPendingIntentCandidates,
    });
  };

  const updateIntentCandidate = (
    candidateId: string,
    patch: Partial<PendingIntentCandidate>
  ) => {
    args.setPendingIntentCandidates((prev) =>
      prev.map((item) =>
        item.id === candidateId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const rejectIntentCandidate = (candidateId: string) => {
    rejectIntentCandidateFlow({
      candidateId,
      pendingIntentCandidates: args.pendingIntentCandidates,
      getIntentCandidateSignature,
      setRejectedIntentCandidateSignatures: args.setRejectedIntentCandidateSignatures,
      setPendingIntentCandidates: args.setPendingIntentCandidates,
    });
  };

  const setProtocolRulebookToKinDraft = () => {
    setProtocolRulebookToKinDraftFlow({
      protocolRulebook: args.protocolRulebook,
      setKinInput: args.setKinInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const sendProtocolRulebookToKin = async () => {
    await sendProtocolRulebookToKinFlow({
      protocolRulebook: args.protocolRulebook,
      sendKinMessage,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const handleSaveMemorySettings = (next: any) => {
    args.updateMemorySettings(next);
  };

  const handleResetMemorySettings = () => {
    args.resetMemorySettings();
  };

  return {
    currentKinProfile,
    currentKinLabel,
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendToGpt,
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
    sendLastKinToGptDraft,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
    receiveLastKinResponseToGptInput,
    injectFileToKinDraft,
    prepareTaskRequestAck,
    prepareTaskSync,
    resetProtocolDefaults,
    saveProtocolDefaults,
    approveIntentCandidate,
    updateIntentCandidate,
    rejectIntentCandidate,
    setProtocolRulebookToKinDraft,
    sendProtocolRulebookToKin,
    handleSaveMemorySettings,
    handleResetMemorySettings,
  };
}
