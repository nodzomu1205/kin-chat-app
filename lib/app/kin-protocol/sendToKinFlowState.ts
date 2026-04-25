import {
  buildProgressAckResponseBlock,
  buildResendLastMessageBlock,
  extractTaskProtocolEvents,
} from "@/lib/taskRuntimeProtocol";

export function extractTaskIdFromOutboundText(text: string): string | undefined {
  const directMatch = text.match(/TASK_ID:\s*([^\n\r]+)/);
  if (directMatch?.[1]?.trim()) return directMatch[1].trim();

  const sysTaskMatch = text.match(/<<SYS_TASK>>[\s\S]*?#(\d{3,})/);
  if (sysTaskMatch?.[1]) return sysTaskMatch[1];

  return undefined;
}

export function hasKinReceivedAck(text: string) {
  return /<<(?:SYS_KIN_RESPONSE|KIN_RESPONSE)>>[\s\S]*?Received\.\s*Send the next(?: part)?\.[\s\S]*?<<(?:END_SYS_KIN_RESPONSE|END_SYS_RESPONSE|END_KIN_RESPONSE)>>/i.test(
    text
  );
}

export function hasKinReceipt(text: string) {
  return /<<(?:SYS_KIN_RESPONSE|KIN_RESPONSE)>>[\s\S]*?Received\.[\s\S]*?<<(?:END_SYS_KIN_RESPONSE|END_SYS_RESPONSE|END_KIN_RESPONSE)>>/i.test(
    text
  );
}

export function resolvePendingKinInjectionAction(params: {
  text: string;
  currentPendingBlock: string | null;
  replyText: string;
  pendingKinInjectionIndex: number;
  pendingKinInjectionBlocks: string[];
}) {
  const sentPendingPart =
    typeof params.currentPendingBlock === "string" &&
    params.text === params.currentPendingBlock.trim();

  const nextIndex = params.pendingKinInjectionIndex + 1;
  const isFinalPart = nextIndex >= params.pendingKinInjectionBlocks.length;
  const hasAck = hasKinReceivedAck(params.replyText);
  const hasReceipt = hasKinReceipt(params.replyText);

  if (!sentPendingPart || (!hasAck && !(isFinalPart && hasReceipt))) {
    return {
      type: "none" as const,
      nextIndex: params.pendingKinInjectionIndex,
    };
  }

  if (nextIndex < params.pendingKinInjectionBlocks.length) {
    return {
      type: "advance" as const,
      nextIndex,
      nextInput: params.pendingKinInjectionBlocks[nextIndex],
    };
  }

  return {
    type: "complete" as const,
    nextIndex,
  };
}

export function resolveKinFollowupInput(params: {
  replyText: string;
  outboundText: string;
}) {
  const events = extractTaskProtocolEvents(params.replyText);
  const hasProgress = events.some((event) => event.type === "task_progress");
  const hasOtherRequestLikeEvent = events.some(
    (event) => event.type !== "task_progress" && event.type !== "task_confirm"
  );
  const taskId = events.find((event) => event.taskId)?.taskId;

  if (hasProgress && taskId && !hasOtherRequestLikeEvent) {
    return buildProgressAckResponseBlock({ taskId });
  }

  if (params.replyText === "Kin did not return a usable response.") {
    return buildResendLastMessageBlock({
      taskId: extractTaskIdFromOutboundText(params.outboundText),
    });
  }

  return "";
}
