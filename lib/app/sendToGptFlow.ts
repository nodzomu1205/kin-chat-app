import { createEmptyMemory, type Memory } from "@/lib/memory";
import { generateId } from "@/lib/uuid";
import { buildTaskChatBridgeContext } from "@/lib/taskChatBridge";
import {
  appendRecentAssistantMessage,
  applyProtocolAssistantSideEffects,
  buildAssistantResponseArtifacts,
  buildChatApiRequestPayload,
  buildFinalRequestText,
  handleImplicitSearchArtifacts,
  resolveMemoryUpdateContext,
  resolveProtocolLimitViolation,
} from "@/lib/app/sendToGptFlowHelpers";
import { deriveProtocolSearchContext } from "@/lib/app/sendToGptFlowContext";
import {
  getTaskDirectiveOnlyResponseText,
  shouldRespondToTaskDirectiveOnlyInput,
} from "@/lib/app/sendToGptText";
import type {
  SendToGptFlowMemoryArgs,
  SendToGptFlowProtocolArgs,
  SendToGptFlowRequestArgs,
  SendToGptFlowSearchArgs,
  SendToGptFlowUiArgs,
} from "@/lib/app/sendToGptFlowTypes";
import {
  extractInlineUrlTarget as extractInlineUrlTargetHelper,
  runInlineUrlShortcut,
} from "@/lib/app/sendToGptShortcutFlows";
import { handleYoutubeTranscriptFlow } from "@/lib/app/sendToGptYoutubeFlow";
import { normalizeUsage } from "@/lib/tokenStats";
import type { Message } from "@/types/chat";

type SearchSource = {
  title?: string;
  link?: string;
};

type ChatApiResponse = {
  reply?: string;
  usage?: Parameters<typeof normalizeUsage>[0];
  searchUsed?: boolean;
  searchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchEvidence?: string;
  sources?: SearchSource[];
};

export type RunSendToGptFlowArgs = SendToGptFlowRequestArgs &
  SendToGptFlowSearchArgs &
  SendToGptFlowProtocolArgs &
  SendToGptFlowMemoryArgs &
  SendToGptFlowUiArgs;

export async function runSendToGptFlow({
  gptInput,
  gptLoading,
  processMultipartTaskDoneText,
  instructionMode = "normal",
  onHandleYoutubeTranscriptRequest,
  responseMode,
  taskProtocolRuntime,
  currentTaskId,
  findPendingRequest,
  applyPrefixedTaskFieldsFromText,
  getProtocolLimitViolation,
  shouldInjectTaskContextWithSettings,
  referenceLibraryItems,
  libraryIndexResponseCount,
  buildLibraryReferenceContext,
  taskProtocolAnswerPendingRequest,
  ingestProtocolMessage,
  searchMode,
  searchEngines,
  searchLocation,
  parseWrappedSearchResponse,
  recordSearchContext,
  getContinuationTokenForSeries,
  getAskAiModeLinkForQuery,
  applySearchUsage,
  applyChatUsage,
  handleGptMemory,
  applySummaryUsage,
  chatRecentLimit,
  gptStateRef,
  setGptMessages,
  setGptInput,
  setGptLoading,
  setKinInput,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setActiveTabToKin,
  recordIngestedDocument,
}: RunSendToGptFlowArgs) {
  if (!gptInput.trim() || gptLoading) return;

  const rawText = gptInput.trim();
  const multipartHandled = processMultipartTaskDoneText(rawText, { setGptTab: true });
  if (multipartHandled) {
    const importedMessage: Message = {
      id: generateId(),
      role: "user",
      text: rawText,
    };
    setGptMessages((prev) => [...prev, importedMessage]);
    setGptInput("");
    return;
  }

  const inlineUrlTarget = extractInlineUrlTargetHelper(rawText);
  if (inlineUrlTarget) {
    await runInlineUrlShortcut({
      rawText,
      inlineUrlTarget,
      setGptMessages,
      setGptInput,
      setGptLoading,
    });
    return;
  }

  const {
    askGptEvent,
    searchRequestEvent,
    youtubeTranscriptRequestEvent,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    userQuestionEvent,
    requestToAnswer,
    requestAnswerBody,
    parsedInput,
    effectiveParsedSearchQuery,
    continuationDetails,
    effectiveSearchMode,
    effectiveSearchEngines,
    effectiveSearchLocation,
    searchSeriesId,
    continuationToken,
    askAiModeLink,
  } = deriveProtocolSearchContext({
    rawText,
    findPendingRequest,
    applyPrefixedTaskFieldsFromText,
    searchMode,
    searchEngines,
    searchLocation,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
  });

  if (
    shouldRespondToTaskDirectiveOnlyInput({
      parsedInput,
      effectiveParsedSearchQuery,
    })
  ) {
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: getTaskDirectiveOnlyResponseText(),
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);
    setGptInput("");
    return;
  }

  // Search history is already represented in the reference library, so avoid
  // double-injecting it during normal chat turns.
  const libraryReferenceContext = buildLibraryReferenceContext();
  const effectiveDocumentReferenceContext = "";
  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: rawText,
  };

  const limitViolation = resolveProtocolLimitViolation({
    askGptEvent,
    searchRequestEvent,
    youtubeTranscriptRequestEvent,
    userQuestionEvent,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    currentTaskId,
    getProtocolLimitViolation,
  });

  if (limitViolation) {
    setGptMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: generateId(),
        role: "gpt",
        text: limitViolation,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);
    setGptInput("");
    return;
  }

  if (youtubeTranscriptRequestEvent?.url?.trim()) {
    const handled = await handleYoutubeTranscriptFlow({
      userMsg,
      youtubeTranscriptRequestEvent,
      currentTaskId,
      onHandleYoutubeTranscriptRequest,
      setGptMessages,
      setGptInput,
      setGptLoading,
      setKinInput,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setActiveTabToKin,
      recordIngestedDocument,
      ingestProtocolMessage,
      gptStateRef,
      chatRecentLimit,
      handleGptMemory,
      applySummaryUsage,
    });
    if (handled) return;
    return;
  }

  const shouldInjectTaskContext =
    !!currentTaskId && shouldInjectTaskContextWithSettings(rawText);
  const taskContext = shouldInjectTaskContext
    ? buildTaskChatBridgeContext(taskProtocolRuntime)
    : "";

  const finalRequestText = buildFinalRequestText({
    rawText,
    parsedInput,
    effectiveParsedSearchQuery,
    askGptEvent,
    requestToAnswer,
    requestAnswerBody,
    searchRequestEvent,
    currentTaskId,
    effectiveSearchEngines,
    effectiveSearchLocation,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    referenceLibraryItems,
    libraryIndexResponseCount,
    taskContext,
  });

  const memoryContext = resolveMemoryUpdateContext({
    gptState: gptStateRef.current,
    userMessage: userMsg,
    chatRecentLimit,
  });
  const requestMemory =
    (gptStateRef.current.memory as Memory | undefined) || createEmptyMemory();
  setGptMessages((prev) => [...prev, userMsg]);
  setGptInput("");
  setGptLoading(true);

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildChatApiRequestPayload({
          requestMemory,
          recentMessages: memoryContext.recentWithUser,
          input: finalRequestText,
          storedDocumentContext: effectiveDocumentReferenceContext,
          storedLibraryContext: libraryReferenceContext,
          forcedSearchQuery:
            continuationDetails.cleanQuery ||
            searchRequestEvent?.query ||
            effectiveParsedSearchQuery ||
            undefined,
          searchSeriesId,
          searchContinuationToken: continuationToken || undefined,
          searchAskAiModeLink: askAiModeLink || undefined,
          searchMode: effectiveSearchMode,
          searchEngines: effectiveSearchEngines,
          searchLocation: effectiveSearchLocation,
          instructionMode,
          reasoningMode: responseMode,
        })
      ),
    });

    const data = (await res.json()) as ChatApiResponse;
    const { assistantText, normalizedSources } = buildAssistantResponseArtifacts({
      data,
      parseWrappedSearchResponse,
      askGptEvent,
      currentTaskId,
      requestToAnswer,
      requestAnswerBody,
      searchRequestEvent,
      effectiveSearchMode,
      effectiveSearchEngines,
      effectiveSearchLocation,
      searchSeriesId,
      cleanQuery: continuationDetails.cleanQuery,
      recordSearchContext,
    });

    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: assistantText,
      sources: normalizedSources,
      meta: {
        kind: "normal",
        sourceType: data.searchUsed ? "search" : "gpt_input",
      },
    };
    applyProtocolAssistantSideEffects({
      assistantText,
      ingestProtocolMessage,
      requestToAnswer,
      requestAnswerBody,
      taskProtocolAnswerPendingRequest,
    });

    const updatedRecent = appendRecentAssistantMessage({
      recentMessages: memoryContext.recentWithUser,
      assistantMessage: assistantMsg,
      chatRecentLimit,
    });

    setGptMessages((prev) => [...prev, assistantMsg]);

    handleImplicitSearchArtifacts({
      data,
      searchRequestEvent,
      effectiveSearchMode,
      effectiveSearchEngines,
      effectiveSearchLocation,
      searchSeriesId,
      cleanQuery: continuationDetails.cleanQuery,
      effectiveParsedSearchQuery,
      finalRequestText,
      applySearchUsage,
      applyChatUsage,
      recordSearchContext,
    });

    if (searchRequestEvent) {
      applySearchUsage(data.usage);
    }

    const memoryResult = await handleGptMemory(updatedRecent, {
      previousCommittedTopic: memoryContext.previousCommittedTopic,
    });
    applySummaryUsage(memoryResult.summaryUsage);
  } catch (error) {
    console.error(error);
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "GPT request failed.",
      },
    ]);
  } finally {
    setGptLoading(false);
  }
}
