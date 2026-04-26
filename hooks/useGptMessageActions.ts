import { useState } from "react";
import { generateId } from "@/lib/shared/uuid";
import { runSendToGptFlow } from "@/lib/app/send-to-gpt/sendToGptFlow";
import { receiveLastKinResponseFlow } from "@/lib/app/task-runtime/kinTaskFlow";
import { extractPreferredKinTransferText } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import {
  buildYoutubeTranscriptAssistantMessage,
  buildYoutubeTranscriptDocumentRecord,
  buildYoutubeTranscriptFailureState,
  buildYoutubeTranscriptRequestBodyWithOptions,
  resolveYoutubeTranscriptBatchRequest,
} from "@/lib/app/send-to-gpt/sendToGptYoutubeFlowBuilders";
import {
  buildYoutubeTranscriptSuccessArtifacts,
  extractYouTubeVideoIdFromUrl,
} from "@/lib/app/send-to-gpt/sendToGptTranscriptHelpers";
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
import { normalizeUsage } from "@/lib/shared/tokenStats";
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
    const resolvedVideoId = extractYouTubeVideoIdFromUrl(params.transcriptUrl);
    if (!resolvedVideoId) {
      throw new Error("Invalid YouTube URL");
    }

    if (params.appendUserMessage) {
      args.setGptMessages((prev) => [...prev, params.appendUserMessage as Message]);
    }
    args.setGptInput("");
    args.setGptLoading(true);

    try {
      const response = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildYoutubeTranscriptRequestBodyWithOptions({
            videoId: resolvedVideoId,
            generateSummary: args.autoGenerateFileImportSummary,
          })
        ),
      });
      const data = (await response.json()) as {
        title?: string;
        filename?: string;
        text?: string;
        cleanText?: string;
        summary?: string;
        usage?: {
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
        };
        error?: string;
      };
      if (!response.ok || !data.text) {
        throw new Error(data.error || "YouTube transcript fetch failed");
      }
      args.applyIngestUsage(normalizeUsage(data.usage));

      const now = new Date().toISOString();
      const transcriptArtifacts = buildYoutubeTranscriptSuccessArtifacts({
        data,
        videoId: resolvedVideoId,
        transcriptUrl: params.transcriptUrl,
        outputMode: params.outputMode,
        taskId: params.taskId,
        actionId: params.actionId,
        storedDocumentId: "",
      });
      const storedDocument = args.recordIngestedDocument(
        buildYoutubeTranscriptDocumentRecord({
          artifacts: transcriptArtifacts,
          taskId: params.taskId,
          now,
        })
      );
      const finalizedArtifacts = buildYoutubeTranscriptSuccessArtifacts({
        data,
        videoId: resolvedVideoId,
        transcriptUrl: params.transcriptUrl,
        outputMode: params.outputMode,
        taskId: params.taskId,
        actionId: params.actionId,
        storedDocumentId: storedDocument.id,
      });
      const assistantMsg = buildYoutubeTranscriptAssistantMessage(
        finalizedArtifacts.assistantText
      );

      args.ingestProtocolMessage(finalizedArtifacts.assistantText, "gpt_to_kin");
      args.setKinInput(finalizedArtifacts.kinBlocks[0] || "");
      args.setPendingKinInjectionBlocks(
        finalizedArtifacts.kinBlocks.length > 1 ? finalizedArtifacts.kinBlocks : []
      );
      args.setPendingKinInjectionIndex(0);
      args.focusKinPanel();

      args.setGptMessages((prev) => [...prev, assistantMsg]);
      const updatedRecent = [
        ...(args.gptMemoryRuntime.gptStateRef.current?.recentMessages || []),
        assistantMsg,
      ].slice(-args.gptMemoryRuntime.chatRecentLimit);
      const memoryResult = await args.gptMemoryRuntime.handleGptMemory(
        updatedRecent,
        {}
      );
      if (memoryResult.fallbackUsage) {
        args.applyChatUsage(memoryResult.fallbackUsage, {
          mergeIntoLast: true,
          followupMetrics: memoryResult.fallbackMetrics,
          followupUsageDetails: memoryResult.fallbackUsageDetails,
          followupDebug: memoryResult.fallbackDebug,
        });
      }
      if (memoryResult.compressionUsage) {
        args.applyCompressionUsage(memoryResult.compressionUsage);
      }
    } catch (error) {
      console.error(error);
      const failureState = buildYoutubeTranscriptFailureState({
        taskId: params.taskId,
        actionId: params.actionId,
        transcriptUrl: params.transcriptUrl,
        outputMode: params.outputMode,
      });
      args.setGptMessages((prev) => [...prev, failureState.message]);
      args.ingestProtocolMessage(failureState.failureText, "gpt_to_kin");
      args.setPendingKinInjectionBlocks([]);
      args.setPendingKinInjectionIndex(0);
      args.setKinInput(failureState.retryBlock);
      args.focusKinPanel();
    } finally {
      args.setGptLoading(false);
    }
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
