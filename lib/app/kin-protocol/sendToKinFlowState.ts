import {
  buildProgressAckResponseBlock,
  buildResendLastMessageBlock,
  extractTaskProtocolEvents,
} from "@/lib/task/taskRuntimeProtocol";

export function extractTaskIdFromOutboundText(text: string): string | undefined {
  const directMatch = text.match(/TASK_ID:\s*([^\n\r]+)/);
  if (directMatch?.[1]?.trim()) return directMatch[1].trim();

  const sysTaskMatch = text.match(/<<SYS_TASK>>[\s\S]*?#([A-Za-z]?\d{3,})/);
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

function parsePartPosition(text: string) {
  const match = text.match(/(?:^|\n)(?:PART:\s*)?(\d+)\s*\/\s*(\d+)(?:\n|$)/i);
  if (!match) return null;
  return {
    index: Number(match[1]),
    total: Number(match[2]),
  };
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
  const sentPart = parsePartPosition(params.text);
  const pendingPart =
    typeof params.currentPendingBlock === "string"
      ? parsePartPosition(params.currentPendingBlock)
      : null;
  const sentMatchingPartMarker =
    Boolean(sentPart && pendingPart) &&
    sentPart?.index === pendingPart?.index &&
    sentPart?.total === pendingPart?.total;

  const nextIndex = params.pendingKinInjectionIndex + 1;
  const isFinalPart = nextIndex >= params.pendingKinInjectionBlocks.length;
  const hasAck = hasKinReceivedAck(params.replyText);
  const hasReceipt = hasKinReceipt(params.replyText);
  const sentCurrentPart = sentPendingPart || sentMatchingPartMarker;

  if (
    !sentCurrentPart ||
    (!hasAck && !isFinalPart)
  ) {
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
    finalReceiptOnly: !hasAck && hasReceipt,
    finalReplyNeedsTaskContinuation:
      isFinalPart && (!hasReceipt || (!hasAck && hasReceipt)),
  };
}

export function buildContinueTaskAfterMultipartReceiptBlock() {
  return [
    "<<SYS_GPT_RESPONSE>>",
    "BODY: Noted. Continue the task.",
    "<<END_SYS_GPT_RESPONSE>>",
  ].join("\n");
}

function stripKinReceiptBlocks(text: string) {
  return text
    .replace(
      /<<(?:SYS_KIN_RESPONSE|KIN_RESPONSE)>>[\s\S]*?<<(?:END_SYS_KIN_RESPONSE|END_SYS_RESPONSE|END_KIN_RESPONSE)>>/gi,
      ""
    )
    .trim();
}

export function shouldPromptKinToContinueAfterPendingInfoDelivery(replyText: string) {
  const withoutReceipts = stripKinReceiptBlocks(replyText);
  const events = extractTaskProtocolEvents(withoutReceipts);

  if (!withoutReceipts && hasKinReceipt(replyText)) {
    return true;
  }

  if (events.length === 0) {
    return false;
  }

  return events.every(
    (event) => event.type === "task_progress" || event.type === "task_confirm"
  );
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
