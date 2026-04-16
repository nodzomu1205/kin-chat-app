import { generateId } from "@/lib/uuid";
import {
  appendRecentAssistantMessage,
  applyProtocolAssistantSideEffects,
  handleImplicitSearchArtifacts,
} from "@/lib/app/sendToGptFlowState";
import type {
  ChatApiSearchLike,
  PendingRequestLike,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export async function finalizeSendToGptFlow(args: {
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
  memoryContext: {
    recentWithUser: Message[];
    previousCommittedTopic?: string;
  };
  chatRecentLimit: number;
  searchRequestEvent?: {
    query?: string;
  };
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  effectiveParsedSearchQuery: string;
  finalRequestText: string;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
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
  const assistantMsg: Message = {
    id: generateId(),
    role: "gpt",
    text: args.assistantText,
    sources: args.normalizedSources,
    meta: {
      kind: "normal",
      sourceType: args.data.searchUsed ? "search" : "gpt_input",
    },
  };

  applyProtocolAssistantSideEffects({
    assistantText: args.assistantText,
    ingestProtocolMessage: args.ingestProtocolMessage,
    requestToAnswer: args.requestToAnswer,
    requestAnswerBody: args.requestAnswerBody,
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
    searchRequestEvent: args.searchRequestEvent,
    effectiveSearchMode: args.effectiveSearchMode,
    effectiveSearchEngines: args.effectiveSearchEngines,
    effectiveSearchLocation: args.effectiveSearchLocation,
    searchSeriesId: args.searchSeriesId,
    cleanQuery: args.cleanQuery,
    effectiveParsedSearchQuery: args.effectiveParsedSearchQuery,
    finalRequestText: args.finalRequestText,
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
    recordSearchContext: args.recordSearchContext,
  });

  if (args.searchRequestEvent) {
    args.applySearchUsage(args.data.usage);
  }

  const memoryResult = await args.handleGptMemory(updatedRecent, {
    previousCommittedTopic: args.memoryContext.previousCommittedTopic,
  });
  args.applySummaryUsage(memoryResult.summaryUsage);
}
