import { resolvePreparedRequestGateDecision } from "@/lib/app/send-to-gpt/sendToGptFlowDecisionState";
import {
  buildProtocolLimitViolationGateContext,
  buildTaskDirectiveOnlyGateContext,
  buildYoutubeTranscriptGateContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowGateContextBuilders";
import type { Dispatch, SetStateAction } from "react";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/shared/tokenStats";
import type { Message } from "@/types/chat";
import type { ParsedInputLike } from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type { PreparedRequestGateContext } from "@/lib/app/send-to-gpt/sendToGptPreparedRequestTypes";
import {
  handleProtocolLimitViolationGate,
  handleFileSaveRequestGate,
  handleTaskDirectiveOnlyGate,
  handleYoutubeTranscriptGate,
} from "@/lib/app/send-to-gpt/sendToGptPreparedGateHandlers";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";

export {
  handleProtocolLimitViolationGate,
  handleFileSaveRequestGate,
  handleTaskDirectiveOnlyGate,
  handleYoutubeTranscriptGate,
} from "@/lib/app/send-to-gpt/sendToGptPreparedGateHandlers";

export async function runPreparedRequestGates(args: {
  preparedRequest: PreparedRequestGateContext;
  shouldRespondToTaskDirectiveOnlyInput: (params: {
    parsedInput: ParsedInputLike;
    effectiveParsedSearchQuery: string;
  }) => boolean;
  taskDirectiveOnlyResponseText: string;
  currentTaskId: string | null;
  onHandleYoutubeTranscriptRequest?: (params: {
    userMessage: Message;
    youtubeTranscriptRequestEvent: TaskProtocolEvent;
    currentTaskId: string | null;
  }) => Promise<boolean>;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setPendingKinInjectionPurpose?: Dispatch<
    SetStateAction<PendingKinInjectionPurpose>
  >;
  setActiveTabToKin?: () => void;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    createdAt: string;
    updatedAt: string;
  }) => { id: string };
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  gptStateRef: { current: { recentMessages?: Message[]; memory?: unknown } };
  chatRecentLimit: number;
  handleGptMemory: (
    recent: Message[],
    options?: Record<string, unknown>
  ) => Promise<{ compressionUsage?: unknown; fallbackUsage?: unknown }>;
  applyChatUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyCompressionUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyIngestUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}) {
  const taskDirectiveOnlyGateContext = buildTaskDirectiveOnlyGateContext({
    preparedRequest: args.preparedRequest,
    shouldRespondToTaskDirectiveOnlyInput:
      args.shouldRespondToTaskDirectiveOnlyInput,
  });
  const protocolLimitViolationGateContext =
    buildProtocolLimitViolationGateContext({
      preparedRequest: args.preparedRequest,
    });
  const youtubeTranscriptGateContext = buildYoutubeTranscriptGateContext({
    preparedRequest: args.preparedRequest,
  });
  const gateDecision = resolvePreparedRequestGateDecision({
    isTaskDirectiveOnly: taskDirectiveOnlyGateContext.isTaskDirectiveOnly,
    limitViolation: protocolLimitViolationGateContext.limitViolation,
    youtubeTranscriptUrl:
      youtubeTranscriptGateContext.youtubeTranscriptRequestEvent?.url,
  });

  if (
    gateDecision.type === "task_directive_only" &&
    handleTaskDirectiveOnlyGate({
      isTaskDirectiveOnly: taskDirectiveOnlyGateContext.isTaskDirectiveOnly,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      taskDirectiveOnlyResponseText: args.taskDirectiveOnlyResponseText,
    })
  ) {
    return true;
  }

  if (
    gateDecision.type === "protocol_limit_violation" &&
    handleProtocolLimitViolationGate({
      ...protocolLimitViolationGateContext,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
    })
  ) {
    return true;
  }

  if (
    await handleFileSaveRequestGate({
      fileSaveRequestEvent: args.preparedRequest.fileSaveRequestEvent,
      userMsg: args.preparedRequest.userMsg,
      gptStateRef: args.gptStateRef,
      currentTaskCharConstraint: args.preparedRequest.currentTaskCharConstraint,
      recordIngestedDocument: args.recordIngestedDocument,
      applyIngestUsage: args.applyIngestUsage,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
    })
  ) {
    return true;
  }

  if (gateDecision.type !== "youtube_transcript") {
    return false;
  }

  return handleYoutubeTranscriptGate({
    ...youtubeTranscriptGateContext,
    currentTaskId: args.currentTaskId,
    onHandleYoutubeTranscriptRequest: args.onHandleYoutubeTranscriptRequest,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
    setActiveTabToKin: args.setActiveTabToKin,
    recordIngestedDocument: args.recordIngestedDocument,
    ingestProtocolMessage: args.ingestProtocolMessage,
    gptStateRef: args.gptStateRef,
    chatRecentLimit: args.chatRecentLimit,
    handleGptMemory: args.handleGptMemory,
    applyChatUsage: args.applyChatUsage,
    applyCompressionUsage: args.applyCompressionUsage,
    applyIngestUsage: args.applyIngestUsage ?? (() => undefined),
  });
}
