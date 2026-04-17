import {
  appendRecentAssistantMessage,
  applyProtocolAssistantSideEffects,
  createGptAssistantMessage,
  handleImplicitSearchArtifacts,
} from "@/lib/app/sendToGptFlowState";
import type {
  ChatApiSearchLike,
  PreparedRequestFinalizeContext,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, SourceItem } from "@/types/chat";

export async function finalizeSendToGptFlow(args: {
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
  memoryContext: {
    recentWithUser: Message[];
    previousCommittedTopic?: string;
  };
  chatRecentLimit: number;
  preparedRequest: PreparedRequestFinalizeContext;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  applySearchUsage: (usage: ChatApiSearchLike["usage"]) => void;
  applyChatUsage: (usage: ChatApiSearchLike["usage"]) => void;
  recordSearchContext: Parameters<typeof handleImplicitSearchArtifacts>[0]["recordSearchContext"];
  handleGptMemory: (
    recent: Message[],
    options?: { previousCommittedTopic?: string }
  ) => Promise<{ summaryUsage?: ChatApiSearchLike["usage"] }>;
  applySummaryUsage: (usage: ChatApiSearchLike["usage"]) => void;
}) {
  const assistantMsg: Message = createGptAssistantMessage({
    assistantText: args.assistantText,
    normalizedSources: args.normalizedSources,
    sourceType: args.data.searchUsed ? "search" : "gpt_input",
  });

  applyProtocolAssistantSideEffects({
    assistantText: args.assistantText,
    ingestProtocolMessage: args.ingestProtocolMessage,
    requestToAnswer: args.preparedRequest.requestToAnswer,
    requestAnswerBody: args.preparedRequest.requestAnswerBody,
    taskProtocolAnswerPendingRequest: args.taskProtocolAnswerPendingRequest,
  });

  const updatedRecent = appendRecentAssistantMessage({
    recentMessages: args.memoryContext.recentWithUser,
    assistantMessage: assistantMsg,
    chatRecentLimit: args.chatRecentLimit,
  });

  args.setGptMessages((prev) => [...prev, assistantMsg]);

  handleImplicitSearchArtifacts({
    data: args.data,
    searchRequestEvent: args.preparedRequest.searchRequestEvent,
    effectiveSearchMode: args.preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: args.preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: args.preparedRequest.effectiveSearchLocation,
    searchSeriesId: args.preparedRequest.searchSeriesId,
    cleanQuery: args.preparedRequest.cleanQuery,
    effectiveParsedSearchQuery: args.preparedRequest.effectiveParsedSearchQuery,
    finalRequestText: args.preparedRequest.finalRequestText,
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
    recordSearchContext: args.recordSearchContext,
  });

  applyExplicitSearchUsageAfterFinalize({
    data: args.data,
    searchRequestEvent: args.preparedRequest.searchRequestEvent,
    applySearchUsage: args.applySearchUsage,
  });

  await applyFinalizeMemoryFollowUp({
    updatedRecent,
    previousCommittedTopic: args.memoryContext.previousCommittedTopic,
    handleGptMemory: args.handleGptMemory,
    applySummaryUsage: args.applySummaryUsage,
  });
}

export function applyExplicitSearchUsageAfterFinalize(args: {
  data: ChatApiSearchLike;
  searchRequestEvent?: PreparedRequestFinalizeContext["searchRequestEvent"];
  applySearchUsage: (usage: ChatApiSearchLike["usage"]) => void;
}) {
  if (!args.searchRequestEvent) return;
  args.applySearchUsage(args.data.usage);
}

export async function applyFinalizeMemoryFollowUp(args: {
  updatedRecent: Message[];
  previousCommittedTopic?: string;
  handleGptMemory: (
    recent: Message[],
    options?: { previousCommittedTopic?: string }
  ) => Promise<{ summaryUsage?: ChatApiSearchLike["usage"] }>;
  applySummaryUsage: (usage: ChatApiSearchLike["usage"]) => void;
}) {
  const memoryResult = await args.handleGptMemory(args.updatedRecent, {
    previousCommittedTopic: args.previousCommittedTopic,
  });
  args.applySummaryUsage(memoryResult.summaryUsage);
}
