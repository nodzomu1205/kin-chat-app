import { generateId } from "@/lib/uuid";
import { prepareSendToGptRequest } from "@/lib/app/sendToGptFlowRequestPreparation";
import {
  buildSendToGptFinalizeArgs,
  buildSendToGptMemoryBundle,
  buildSendToGptRequestArtifactsArgs,
} from "@/lib/app/sendToGptFlowBundles";
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

  const { memoryContext, requestMemory } = buildSendToGptMemoryBundle({
    gptStateRef,
    userMsg: preparedRequest.userMsg,
    chatRecentLimit,
  });
  setGptMessages((prev) => [...prev, preparedRequest.userMsg]);
  setGptInput("");
  setGptLoading(true);

  try {
    const { data, assistantText, normalizedSources } =
      await requestGptAssistantArtifacts(
        buildSendToGptRequestArtifactsArgs({
          requestMemory,
          recentMessages: memoryContext.recentWithUser,
          preparedRequest,
          instructionMode,
          responseMode,
          parseWrappedSearchResponse,
          currentTaskId,
          recordSearchContext,
        })
      );

    await finalizeSendToGptFlow(
      buildSendToGptFinalizeArgs({
        data,
        assistantText,
        normalizedSources,
        memoryContext,
        chatRecentLimit,
        preparedRequest,
        ingestProtocolMessage,
        taskProtocolAnswerPendingRequest,
        setGptMessages,
        applySearchUsage,
        applyChatUsage,
        recordSearchContext,
        handleGptMemory,
        applySummaryUsage,
      })
    );
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
