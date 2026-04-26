import { useState } from "react";
import { generateId } from "@/lib/shared/uuid";
import { runSendToGptFlow } from "@/lib/app/send-to-gpt/sendToGptFlow";
import { receiveLastKinResponseFlow } from "@/lib/app/task-runtime/kinTaskFlow";
import { extractPreferredKinTransferText } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import { resolveYoutubeTranscriptBatchRequest } from "@/lib/app/send-to-gpt/sendToGptYoutubeFlowBuilders";
import { runYoutubeTranscriptRequestItemFlow } from "@/lib/app/send-to-gpt/sendToGptYoutubeFlow";
import {
  runImportYouTubeTranscriptFlow,
  runSendYouTubeTranscriptToKinFlow,
} from "@/lib/app/send-to-gpt/youtubeTranscriptLibraryFlows";
import type { GptInstructionMode } from "@/components/panels/gpt/gptPanelTypes";
import type { UseGptMessageActionsArgs } from "@/hooks/chatPageActionTypes";
import {
  buildCommonSendToGptFlowArgs,
  mergeSendToGptFlowArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowArgBuilders";
import type { Message, SourceItem } from "@/types/chat";

export function useGptMessageActions(args: UseGptMessageActionsArgs) {
  const [pendingYoutubeTranscriptQueue, setPendingYoutubeTranscriptQueue] =
    useState<{
      taskId: string;
      outputMode: string;
      items: Array<{ url: string; actionId: string }>;
    } | null>(null);

  const fetchAndPrepareYoutubeTranscript = async (params: {
    transcriptUrl: string;
    taskId: string;
    actionId: string;
    outputMode: string;
    appendUserMessage?: Message | null;
  }) => {
    await runYoutubeTranscriptRequestItemFlow({
      ...params,
      generateSummary: args.autoGenerateFileImportSummary,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setKinInput: args.setKinInput,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      focusKinPanel: args.focusKinPanel,
      recordIngestedDocument: args.recordIngestedDocument,
      ingestProtocolMessage: args.ingestProtocolMessage,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      applyIngestUsage: args.applyIngestUsage,
    });
  };

  const continueQueuedYouTubeTranscriptBatch = async () => {
    if (!pendingYoutubeTranscriptQueue || pendingYoutubeTranscriptQueue.items.length === 0) {
      return;
    }
    const [nextItem, ...restItems] = pendingYoutubeTranscriptQueue.items;
    setPendingYoutubeTranscriptQueue(
      restItems.length > 0
        ? {
            ...pendingYoutubeTranscriptQueue,
            items: restItems,
          }
        : null
    );
    await fetchAndPrepareYoutubeTranscript({
      transcriptUrl: nextItem.url,
      taskId: pendingYoutubeTranscriptQueue.taskId,
      actionId: nextItem.actionId,
      outputMode: pendingYoutubeTranscriptQueue.outputMode,
      appendUserMessage: null,
    });
  };

  const handleYoutubeTranscriptRequestBatch = async (params: {
    userMessage: Message;
    youtubeTranscriptRequestEvent: {
      taskId?: string;
      actionId?: string;
      outputMode?: string;
      url?: string;
      urls?: string[];
    };
    currentTaskId: string | null;
  }) => {
    const batch = resolveYoutubeTranscriptBatchRequest({
      event: params.youtubeTranscriptRequestEvent,
      currentTaskId: params.currentTaskId,
    });
    if (!batch) return false;

    setPendingYoutubeTranscriptQueue(
      batch.remainingItems.length > 0
        ? {
            taskId: batch.taskId,
            outputMode: batch.outputMode,
            items: batch.remainingItems,
          }
        : null
    );
    await fetchAndPrepareYoutubeTranscript({
      transcriptUrl: batch.firstItem.url,
      taskId: batch.taskId,
      actionId: batch.firstItem.actionId,
      outputMode: batch.outputMode,
      appendUserMessage: params.userMessage,
    });
    return true;
  };

  const buildCommonFlowArgs = () => {
    return mergeSendToGptFlowArgs(buildCommonSendToGptFlowArgs(args));
  };

  const sendToGpt = async (instructionMode: GptInstructionMode = "normal") => {
    await runSendToGptFlow({
      ...buildCommonFlowArgs(),
      gptInput: args.gptInput,
      searchMode: args.searchMode,
      searchEngines: args.searchEngines,
      searchLocation: args.searchLocation,
      instructionMode,
      onHandleYoutubeTranscriptRequest: handleYoutubeTranscriptRequestBatch,
    });
  };

  const startAskAiModeSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    await runSendToGptFlow({
      ...buildCommonFlowArgs(),
      gptInput: `讀懃ｴ｢: ${trimmedQuery}`,
      searchMode: "ai",
      searchEngines: ["google_ai_mode"],
      searchLocation: args.searchLocation,
      instructionMode: "normal",
    });
  };

  const importYouTubeTranscript = async (source: SourceItem) => {
    await runImportYouTubeTranscriptFlow({
      source,
      autoGenerateSummary: args.autoGenerateFileImportSummary,
      currentTaskId: args.currentTaskDraft.taskId,
      setGptLoading: args.setGptLoading,
      setGptMessages: args.setGptMessages,
      applyIngestUsage: args.applyIngestUsage,
      recordIngestedDocument: args.recordIngestedDocument,
    });
  };

  const sendYouTubeTranscriptToKin = async (source: SourceItem) => {
    await runSendYouTubeTranscriptToKinFlow({
      source,
      autoGenerateSummary: args.autoGenerateFileImportSummary,
      setGptLoading: args.setGptLoading,
      setGptMessages: args.setGptMessages,
      applyIngestUsage: args.applyIngestUsage,
      setKinInput: args.setKinInput,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      focusKinPanel: args.focusKinPanel,
    });
  };

  const sendLastKinToGptDraft = () => {
    const last = [...args.kinMessages].reverse().find((m) => m.role === "kin");
    if (!last) return;

    args.setGptInput(extractPreferredKinTransferText(last.text));
    args.focusGptPanel();
  };

  const receiveLastKinResponseToGptInput = () => {
    receiveLastKinResponseFlow({
      kinMessages: args.kinMessages,
      processMultipartTaskDoneText: args.processMultipartTaskDoneText,
      setGptInput: args.setGptInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToGpt: () => {
        args.focusGptPanel();
      },
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
    continueQueuedYouTubeTranscriptBatch,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
    sendLastGptToKinInfo,
  };
}
