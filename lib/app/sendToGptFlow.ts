import { generateId } from "@/lib/uuid";
import {
  buildPreparedRequestGateContext,
  buildPreparedRequestContexts,
  prepareSendToGptRequest,
} from "@/lib/app/sendToGptFlowRequestPreparation";
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
import { resolveSendToGptFlowStart } from "@/lib/app/sendToGptFlowDecisionState";
import {
  appendSendToGptFailureMessage,
  applySendToGptRequestStart,
  prepareSendToGptMemoryContext,
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
  const startDecision = resolveSendToGptFlowStart({
    gptInput,
    gptLoading,
  });
  if (startDecision.type === "skip") return;

  const { rawText } = startDecision;
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
  const preparedRequestContexts = buildPreparedRequestContexts({
    preparedRequest,
  });

  if (
    await runPreparedRequestGates({
      preparedRequest: preparedRequestContexts.gate,
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

  const { memoryContext, requestMemory } = prepareSendToGptMemoryContext({
    gptState: gptStateRef.current,
    userMessage: preparedRequest.userMsg,
    chatRecentLimit,
  });
  applySendToGptRequestStart({
    userMessage: preparedRequest.userMsg,
    setGptMessages,
    setGptInput,
    setGptLoading,
  });

  try {
    const { data, assistantText, normalizedSources } =
      await requestGptAssistantArtifacts({
        requestMemory,
        recentMessages: memoryContext.recentWithUser,
        ...preparedRequestContexts.execution,
        instructionMode,
        responseMode,
        parseWrappedSearchResponse,
        currentTaskId,
        recordSearchContext,
      });

    await finalizeSendToGptFlow({
      data,
      assistantText,
      normalizedSources,
      memoryContext,
      chatRecentLimit,
      preparedRequest: preparedRequestContexts.finalize,
      ingestProtocolMessage,
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
    appendSendToGptFailureMessage({
      setGptMessages,
    });
  } finally {
    setGptLoading(false);
  }
}
