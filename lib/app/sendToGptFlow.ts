import { generateId } from "@/lib/uuid";
import { prepareSendToGptRequest } from "@/lib/app/sendToGptFlowRequestPreparation";
import {
  runPrePreparationGates,
  runPreparedRequestGates,
} from "@/lib/app/sendToGptFlowGuards";
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
import { extractInlineUrlTarget } from "@/lib/app/sendToGptShortcutFlows";
import { requestGptAssistantArtifacts } from "@/lib/app/sendToGptFlowRequest";
import { finalizeSendToGptFlow } from "@/lib/app/sendToGptFlowFinalize";
import {
  resolveMemoryUpdateContext,
  resolveRequestMemory,
} from "@/lib/app/sendToGptFlowState";

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
  if (
    await runPrePreparationGates({
      rawText,
      processMultipartTaskDoneText,
      extractInlineUrlTarget,
      setGptMessages,
      setGptInput,
      setGptLoading,
    })
  ) {
    return;
  }

  const preparedRequest = prepareSendToGptRequest({
    rawText,
    currentTaskId,
    taskProtocolRuntime,
    findPendingRequest,
    applyPrefixedTaskFieldsFromText,
    searchMode,
    searchEngines,
    searchLocation,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
    getProtocolLimitViolation,
    shouldInjectTaskContextWithSettings,
    referenceLibraryItems,
    libraryIndexResponseCount,
    buildLibraryReferenceContext,
    createUserMessage: (text) => ({
      id: generateId(),
      role: "user",
      text,
    }),
  });

  if (
    await runPreparedRequestGates({
      preparedRequest,
      shouldRespondToTaskDirectiveOnlyInput,
      taskDirectiveOnlyResponseText: getTaskDirectiveOnlyResponseText(),
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
    })
  ) {
    return;
  }

  const memoryContext = resolveMemoryUpdateContext({
    gptState: gptStateRef.current,
    userMessage: preparedRequest.userMsg,
    chatRecentLimit,
  });
  const requestMemory = resolveRequestMemory({
    gptState: gptStateRef.current,
  });
  setGptMessages((prev) => [...prev, preparedRequest.userMsg]);
  setGptInput("");
  setGptLoading(true);

  try {
    const { data, assistantText, normalizedSources } =
      await requestGptAssistantArtifacts({
        requestMemory,
        recentMessages: memoryContext.recentWithUser,
        finalRequestText: preparedRequest.finalRequestText,
        storedDocumentContext:
          preparedRequest.effectiveDocumentReferenceContext,
        storedLibraryContext: preparedRequest.libraryReferenceContext,
        cleanQuery: preparedRequest.continuationDetails.cleanQuery,
        searchRequestEvent: preparedRequest.searchRequestEvent,
        effectiveParsedSearchQuery:
          preparedRequest.effectiveParsedSearchQuery,
        searchSeriesId: preparedRequest.searchSeriesId,
        continuationToken: preparedRequest.continuationToken,
        askAiModeLink: preparedRequest.askAiModeLink,
        effectiveSearchMode: preparedRequest.effectiveSearchMode,
        effectiveSearchEngines: preparedRequest.effectiveSearchEngines,
        effectiveSearchLocation: preparedRequest.effectiveSearchLocation,
        instructionMode,
        responseMode,
        parseWrappedSearchResponse,
        askGptEvent: preparedRequest.askGptEvent,
        currentTaskId,
        requestToAnswer: preparedRequest.requestToAnswer,
        requestAnswerBody: preparedRequest.requestAnswerBody,
        recordSearchContext,
      });

    await finalizeSendToGptFlow({
      data,
      assistantText,
      normalizedSources,
      memoryContext,
      chatRecentLimit,
      searchRequestEvent: preparedRequest.searchRequestEvent,
      effectiveSearchMode: preparedRequest.effectiveSearchMode,
      effectiveSearchEngines: preparedRequest.effectiveSearchEngines,
      effectiveSearchLocation: preparedRequest.effectiveSearchLocation,
      searchSeriesId: preparedRequest.searchSeriesId,
      cleanQuery: preparedRequest.continuationDetails.cleanQuery,
      effectiveParsedSearchQuery: preparedRequest.effectiveParsedSearchQuery,
      finalRequestText: preparedRequest.finalRequestText,
      ingestProtocolMessage,
      requestToAnswer: preparedRequest.requestToAnswer,
      requestAnswerBody: preparedRequest.requestAnswerBody,
      taskProtocolAnswerPendingRequest,
      setGptMessages,
      applySearchUsage,
      applyChatUsage,
      recordSearchContext,
      handleGptMemory,
      applySummaryUsage,
    });
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
