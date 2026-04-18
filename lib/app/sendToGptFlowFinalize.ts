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
  });

  await applyFinalizeMemoryFollowUp(
    buildFinalizeMemoryFollowUpArgs({
      updatedRecent,
      previousCommittedTopic: args.memoryContext.previousCommittedTopic,
      handleGptMemory: args.handleGptMemory,
      applySummaryUsage: args.applySummaryUsage,
    })
  );
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
