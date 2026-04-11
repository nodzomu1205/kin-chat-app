import { generateId } from "@/lib/uuid";
import { runSendToGptFlow } from "@/lib/app/sendToGptFlow";
import { receiveLastKinResponseFlow } from "@/lib/app/kinTaskFlow";
import {
  buildLimitExceededBlock,
  extractTaskProtocolEvents,
} from "@/lib/taskRuntimeProtocol";
import { shouldInjectTaskContext } from "@/lib/taskChatBridge";
import { extractPreferredKinTransferText } from "@/lib/app/kinStructuredProtocol";
import type { UseChatPageActionsArgs } from "@/hooks/useChatPageActions";

export function useGptMessageActions(args: UseChatPageActionsArgs) {
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

  const buildCommonFlowArgs = () => ({
    gptLoading: args.gptLoading,
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
    taskProtocolRuntime: args.taskProtocol.runtime,
    findPendingRequest: (requestId: string) =>
      args.taskProtocol.runtime.pendingRequests.find(
        (item) => item.id === requestId || item.actionId === requestId
      ) || null,
    applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
    buildDocumentReferenceContext: args.buildDocumentReferenceContext,
    buildLibraryReferenceContext: args.buildLibraryReferenceContext,
    referenceLibraryItems: args.referenceLibraryItems,
    libraryIndexResponseCount: args.libraryIndexResponseCount,
    getProtocolLimitViolation,
    shouldInjectTaskContextWithSettings: (userInput: string) =>
      shouldInjectTaskContext({
        userInput,
        settings: args.chatBridgeSettings,
      }),
    parseWrappedSearchResponse,
    getProvisionalMemory: args.getProvisionalMemory,
    currentTaskTitle: undefined,
    activeDocumentTitle: undefined,
    lastSearchQuery: args.lastSearchContext?.query,
    handleGptMemory: args.handleGptMemory,
    chatRecentLimit: args.chatRecentLimit,
    gptStateRef: args.gptStateRef,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setGptState: args.setGptState,
    responseMode: args.responseMode,
    currentTaskId: args.taskProtocol.runtime.currentTaskId,
    taskProtocolAnswerPendingRequest: args.taskProtocol.answerPendingRequest,
    ingestProtocolMessage: args.ingestProtocolMessage,
    recordSearchContext: args.recordSearchContext,
    getContinuationTokenForSeries: args.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: args.getAskAiModeLinkForQuery,
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
    applySummaryUsage: args.applySummaryUsage,
  });

  const sendToGpt = async (instructionMode: any = "normal") => {
    await runSendToGptFlow({
      ...buildCommonFlowArgs(),
      gptInput: args.gptInput,
      searchMode: args.searchMode,
      searchEngines: args.searchEngines,
      searchLocation: args.searchLocation,
      instructionMode,
    });
  };

  const startAskAiModeSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    await runSendToGptFlow({
      ...buildCommonFlowArgs(),
      gptInput: `検索：${trimmedQuery}`,
      searchMode: "ai",
      searchEngines: ["google_ai_mode"],
      searchLocation: args.searchLocation,
      instructionMode: "normal",
    });
  };

  const sendLastKinToGptDraft = () => {
    const last = [...args.kinMessages].reverse().find((m) => m.role === "kin");
    if (!last) return;

    args.setGptInput(extractPreferredKinTransferText(last.text));
    if (args.isMobile) args.setActiveTab("gpt");
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

  const sendLastGptToKinInfo = () => {
    args.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "The latest GPT response is ready to transfer to Kin.",
        meta: {
          kind: "task_info",
          sourceType: "gpt_chat",
        },
      },
    ]);
  };

  return {
    sendToGpt,
    startAskAiModeSearch,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
    sendLastGptToKinInfo,
  };
}
