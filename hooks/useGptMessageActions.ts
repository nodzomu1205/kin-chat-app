import { generateId } from "@/lib/uuid";
import { runSendToGptFlow } from "@/lib/app/sendToGptFlow";
import { receiveLastKinResponseFlow } from "@/lib/app/kinTaskFlow";
import {
  buildLimitExceededBlock,
  extractTaskProtocolEvents,
} from "@/lib/taskRuntimeProtocol";
import { shouldInjectTaskContext } from "@/lib/taskChatBridge";
import {
  extractPreferredKinTransferText,
} from "@/lib/app/kinStructuredProtocol";
import {
  cleanYouTubeTranscriptText,
} from "@/lib/app/youtubeTranscriptText";
import { buildYouTubeTranscriptKinBlocks } from "@/lib/app/youtubeTranscriptKinBlocks";
import type { UseChatPageActionsArgs } from "@/hooks/useChatPageActions";
import type { SourceItem } from "@/types/chat";

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
    type:
      | "ask_gpt"
      | "search_request"
      | "user_question"
      | "library_reference"
      | "youtube_transcript_request";
    taskId?: string;
    actionId?: string;
  }) => {
    const kind =
      event.type === "ask_gpt"
        ? "ask_gpt"
        : event.type === "search_request"
          ? "search_request"
          : event.type === "youtube_transcript_request"
            ? "youtube_transcript_request"
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
          : kind === "youtube_transcript_request"
            ? "YouTube transcript request"
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
    buildLibraryReferenceContext: args.buildLibraryReferenceContext,
    referenceLibraryItems: args.referenceLibraryItems,
    libraryIndexResponseCount: args.libraryIndexResponseCount,
    recordIngestedDocument: args.recordIngestedDocument,
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
      setKinInput: args.setKinInput,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
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

  const importYouTubeTranscript = async (source: SourceItem) => {
    const videoId = source.videoId?.trim();
    if (!videoId) return;

    try {
      const response = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          title: source.title,
          channelName: source.channelName,
          duration: source.duration,
        }),
      });

      const data = (await response.json()) as {
        title?: string;
        filename?: string;
        summary?: string;
        text?: string;
        cleanText?: string;
        error?: string;
      };

      if (!response.ok || !data.text) {
        throw new Error(data.error || "transcript import failed");
      }

      args.recordIngestedDocument({
        title: data.title || `${source.title} [Transcript]`,
        filename: data.filename || `youtube-${videoId}.txt`,
        text: cleanYouTubeTranscriptText(data.cleanText || data.text),
        summary: data.summary || "",
        taskId: args.currentTaskDraft.taskId || undefined,
        charCount: cleanYouTubeTranscriptText(data.cleanText || data.text).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      args.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: `YouTube の文字起こしをライブラリに保存しました: ${data.title || source.title}`,
          meta: {
            kind: "task_info",
            sourceType: "file_ingest",
          },
        },
      ]);
    } catch (error) {
      console.error(error);
      args.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "YouTube の文字起こし取込に失敗しました。",
          meta: {
            kind: "task_info",
            sourceType: "file_ingest",
          },
        },
      ]);
    }
  };

  const sendYouTubeTranscriptToKin = async (source: SourceItem) => {
    const videoId = source.videoId?.trim();
    if (!videoId) return;

    try {
      const response = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          title: source.title,
          channelName: source.channelName,
          duration: source.duration,
        }),
      });

      const data = (await response.json()) as {
        title?: string;
        text?: string;
        cleanText?: string;
        error?: string;
      };

      if (!response.ok || !(data.cleanText || data.text)) {
        throw new Error(data.error || "transcript kin transfer failed");
      }

      const cleanTranscript = cleanYouTubeTranscriptText(data.cleanText || data.text || "");
      const blocks = buildYouTubeTranscriptKinBlocks({
        cleanTranscript,
        title: source.title,
        channelName: source.channelName,
        url: source.link,
      });

      args.setKinInput(blocks[0] || "");
      args.setPendingKinInjectionBlocks(blocks.length > 1 ? blocks : []);
      args.setPendingKinInjectionIndex(0);
      if (args.isMobile) args.setActiveTab("kin");
    } catch (error) {
      console.error(error);
      args.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "YouTube の文字起こしを Kin 送付用に整形できませんでした。",
          meta: {
            kind: "task_info",
            sourceType: "manual",
          },
        },
      ]);
    }
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
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
    sendLastGptToKinInfo,
  };
}
