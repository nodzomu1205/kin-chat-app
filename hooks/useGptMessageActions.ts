import { generateId } from "@/lib/uuid";
import { useState } from "react";
import { runSendToGptFlow } from "@/lib/app/sendToGptFlow";
import { receiveLastKinResponseFlow } from "@/lib/app/kinTaskFlow";
import {
  buildYoutubeTranscriptRetryBlock,
} from "@/lib/taskRuntimeProtocol";
import {
  extractPreferredKinTransferText,
} from "@/lib/app/kinStructuredProtocol";
import {
  cleanYouTubeTranscriptText,
} from "@/lib/app/youtubeTranscriptText";
import { buildYouTubeTranscriptKinBlocks } from "@/lib/app/youtubeTranscriptKinBlocks";
import {
  buildYoutubeTranscriptFailureText,
  buildYoutubeTranscriptSuccessArtifacts,
} from "@/lib/app/sendToGptTranscriptHelpers";
import type { GptInstructionMode } from "@/components/panels/gpt/gptPanelTypes";
import type { UseGptMessageActionsArgs } from "@/hooks/chatPageActionTypes";
import { buildCommonSendToGptFlowArgs } from "@/lib/app/sendToGptFlowArgBuilders";
import type { Message, SourceItem } from "@/types/chat";

export function useGptMessageActions(args: UseGptMessageActionsArgs) {
  const [pendingYoutubeTranscriptQueue, setPendingYoutubeTranscriptQueue] =
    useState<
      | {
          taskId: string;
          outputMode: string;
          items: Array<{ url: string; actionId: string }>;
        }
      | null
    >(null);

  const fetchAndPrepareYoutubeTranscript = async (params: {
    transcriptUrl: string;
    taskId: string;
    actionId: string;
    outputMode: string;
    appendUserMessage?: Message | null;
  }) => {
    const resolvedVideoId = sourceVideoId(params.transcriptUrl);
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
        body: JSON.stringify({ videoId: resolvedVideoId }),
      });
      const data = (await response.json()) as {
        title?: string;
        filename?: string;
        text?: string;
        cleanText?: string;
        summary?: string;
        error?: string;
      };
      if (!response.ok || !data.text) {
        throw new Error(data.error || "YouTube transcript fetch failed");
      }

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
      const storedDocument = args.recordIngestedDocument({
        title: transcriptArtifacts.title,
        filename: transcriptArtifacts.filename,
        text: transcriptArtifacts.cleanTranscript,
        summary: transcriptArtifacts.summary,
        taskId: params.taskId || undefined,
        charCount: transcriptArtifacts.cleanTranscript.length,
        createdAt: now,
        updatedAt: now,
      });
      const finalizedArtifacts = buildYoutubeTranscriptSuccessArtifacts({
        data,
        videoId: resolvedVideoId,
        transcriptUrl: params.transcriptUrl,
        outputMode: params.outputMode,
        taskId: params.taskId,
        actionId: params.actionId,
        storedDocumentId: storedDocument.id,
      });
      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: finalizedArtifacts.assistantText,
        meta: {
          kind: "task_info",
          sourceType: "file_ingest",
        },
      };

      args.ingestProtocolMessage(finalizedArtifacts.assistantText, "gpt_to_kin");
      args.setKinInput(finalizedArtifacts.kinBlocks[0] || "");
      args.setPendingKinInjectionBlocks(
        finalizedArtifacts.kinBlocks.length > 1 ? finalizedArtifacts.kinBlocks : []
      );
      args.setPendingKinInjectionIndex(0);
      if (args.isMobile) args.setActiveTab("kin");

      args.setGptMessages((prev) => [...prev, assistantMsg]);
      const updatedRecent = [
        ...(args.gptMemoryRuntime.gptStateRef.current?.recentMessages || []),
        assistantMsg,
      ].slice(-args.gptMemoryRuntime.chatRecentLimit);
      const memoryResult = await args.gptMemoryRuntime.handleGptMemory(
        updatedRecent,
        {}
      );
      args.applySummaryUsage(memoryResult.summaryUsage);
    } catch (error) {
      console.error(error);
      const failureText = buildYoutubeTranscriptFailureText({
        taskId: params.taskId,
        actionId: params.actionId,
        transcriptUrl: params.transcriptUrl,
        outputMode: params.outputMode,
      });
      const retryBlock = buildYoutubeTranscriptRetryBlock({
        taskId: params.taskId,
        actionId: params.actionId,
        url: params.transcriptUrl,
      });
      args.setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: failureText,
          meta: {
            kind: "task_info",
            sourceType: "manual",
          },
        },
      ]);
      args.ingestProtocolMessage(failureText, "gpt_to_kin");
      args.setPendingKinInjectionBlocks([]);
      args.setPendingKinInjectionIndex(0);
      args.setKinInput(retryBlock);
      if (args.isMobile) args.setActiveTab("kin");
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
    const urls = Array.from(
      new Set(
        (params.youtubeTranscriptRequestEvent.urls?.length
          ? params.youtubeTranscriptRequestEvent.urls
          : [params.youtubeTranscriptRequestEvent.url || ""])
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ).slice(0, 3);

    if (urls.length === 0) return false;

    const taskId = params.youtubeTranscriptRequestEvent.taskId || params.currentTaskId || "";
    const outputMode =
      params.youtubeTranscriptRequestEvent.outputMode || "summary_plus_raw";
    const actionIdBase =
      params.youtubeTranscriptRequestEvent.actionId || "YOUTUBE_TRANSCRIPT";
    const queueItems = urls.map((url, index) => ({
      url,
      actionId: urls.length === 1 ? actionIdBase : `${actionIdBase}-${index + 1}`,
    }));

    const [firstItem, ...restItems] = queueItems;
    setPendingYoutubeTranscriptQueue(
      restItems.length > 0
        ? {
            taskId,
            outputMode,
            items: restItems,
          }
        : null
    );
    await fetchAndPrepareYoutubeTranscript({
      transcriptUrl: firstItem.url,
      taskId,
      actionId: firstItem.actionId,
      outputMode,
      appendUserMessage: params.userMessage,
    });
    return true;
  };

  function sourceVideoId(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      if (/youtu\\.be$/i.test(parsed.hostname)) {
        return parsed.pathname.replace(/^\/+/, "").trim();
      }
      if (/youtube\\.com$/i.test(parsed.hostname) || /www\\.youtube\\.com$/i.test(parsed.hostname)) {
        return parsed.searchParams.get("v")?.trim() || "";
      }
    } catch {}
    return "";
  }
  const buildCommonFlowArgs = () => {
    const { protocolArgs, searchArgs, memoryArgs, uiArgs, requestArgs } =
      buildCommonSendToGptFlowArgs(args);

    return {
      ...protocolArgs,
      ...searchArgs,
      ...memoryArgs,
      ...uiArgs,
      ...requestArgs,
    };
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
    continueQueuedYouTubeTranscriptBatch,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
    sendLastGptToKinInfo,
  };
}
