import {
  appendRecentAssistantMessage,
  applyProtocolAssistantSideEffects,
  createGptAssistantMessage,
  handleImplicitSearchArtifacts,
} from "@/lib/app/sendToGptFlowState";
import type {
  ChatApiSearchLike,
  FinalizeSendToGptFlowArgs,
  PreparedRequestFinalizeContext,
} from "@/lib/app/sendToGptFlowTypes";
import type { ConversationUsageOptions } from "@/lib/tokenStats";
import type { Message } from "@/types/chat";
import {
  buildFinalizeAssistantMessageArgs,
  buildFinalizeImplicitSearchArgs,
  buildFinalizeMemoryFollowUpArgs,
  buildFinalizeProtocolSideEffectArgs,
} from "@/lib/app/sendToGptFlowFinalizeBuilders";

export async function finalizeSendToGptFlow(args: FinalizeSendToGptFlowArgs) {
  const assistantMsg: Message = createGptAssistantMessage(
    buildFinalizeAssistantMessageArgs(args)
  );

  applyProtocolAssistantSideEffects(buildFinalizeProtocolSideEffectArgs(args));

  const updatedRecent = appendRecentAssistantMessage({
    recentMessages: args.memoryContext.recentWithUser,
    assistantMessage: assistantMsg,
    chatRecentLimit: args.chatRecentLimit,
  });

  args.setGptMessages((prev) => [...prev, assistantMsg]);

  handleImplicitSearchArtifacts(buildFinalizeImplicitSearchArgs(args));

  applyExplicitSearchUsageAfterFinalize({
    data: args.data,
    searchRequestEvent: args.preparedRequest.searchRequestEvent,
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
  });

  await applyFinalizeMemoryFollowUp(
    buildFinalizeMemoryFollowUpArgs({
      updatedRecent,
      previousCommittedTopic: args.memoryContext.previousCommittedTopic,
      handleGptMemory: args.handleGptMemory,
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
    })
  );
}

export function applyExplicitSearchUsageAfterFinalize(args: {
  data: ChatApiSearchLike;
  searchRequestEvent?: PreparedRequestFinalizeContext["searchRequestEvent"];
  applySearchUsage: (usage: ChatApiSearchLike["usage"]) => void;
  applyChatUsage: (
    usage: ChatApiSearchLike["usage"],
    options?: ConversationUsageOptions
  ) => void;
}) {
  if (!args.searchRequestEvent) return;
  if (args.data.promptMetrics) {
    args.applyChatUsage(null, {
      promptMetrics: args.data.promptMetrics,
      usageDetails: args.data.usageDetails,
    });
  }
  args.applySearchUsage(args.data.usage);
}

export async function applyFinalizeMemoryFollowUp(args: {
  updatedRecent: Message[];
  previousCommittedTopic?: string;
  handleGptMemory: (
    recent: Message[],
    options?: { previousCommittedTopic?: string }
  ) => Promise<{
    compressionUsage?: ChatApiSearchLike["usage"];
    fallbackUsage?: ChatApiSearchLike["usage"];
    fallbackUsageDetails?: Record<string, unknown> | null;
    fallbackMetrics?: {
      promptChars: number;
      rawReplyChars: number;
    } | null;
    fallbackDebug?: {
      prompt: string;
      rawReply: string;
      parsed: unknown;
      usageDetails?: Record<string, unknown> | null;
    } | null;
  }>;
  applyChatUsage: (
    usage: ChatApiSearchLike["usage"],
    options?: ConversationUsageOptions
  ) => void;
  applyCompressionUsage: (usage: ChatApiSearchLike["usage"]) => void;
}) {
  const memoryResult = await args.handleGptMemory(args.updatedRecent, {
    previousCommittedTopic: args.previousCommittedTopic,
  });
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
}

