import type { Dispatch, SetStateAction } from "react";
import { generateId } from "@/lib/shared/uuid";
import type { Message } from "@/types/chat";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { KinConnectionState } from "@/hooks/useKinManager";
import {
  buildContinueTaskAfterMultipartReceiptBlock,
  resolveKinFollowupInput,
  resolvePendingKinInjectionAction,
  shouldPromptKinToContinueAfterPendingInfoDelivery,
} from "@/lib/app/kin-protocol/sendToKinFlowState";

type RunSendKinMessageFlowArgs = {
  text: string;
  currentKin: string | null;
  kinLoading: boolean;
  setKinConnectionState: Dispatch<SetStateAction<KinConnectionState>>;
  setKinLoading: Dispatch<SetStateAction<boolean>>;
  pendingKinInjectionBlocks: string[];
  pendingKinInjectionIndex: number;
  pendingKinInjectionPurpose?: PendingKinInjectionPurpose;
  setKinMessages: Dispatch<SetStateAction<Message[]>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  processMultipartTaskDoneText: (text: string) => unknown;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  clearPendingKinInjection: () => void;
  onPendingKinAck?: () => void | Promise<void>;
  onSysTaskSent?: (text: string) => void | Promise<void>;
  onKinReply?: (text: string) => void | Promise<void>;
  kinSpeakerLabel?: string | null;
  manageLoading?: boolean;
  managePendingInjection?: boolean;
  appendUserMessage?: boolean;
};

type KindroidApiResponse = {
  reply?: string;
};

export async function runSendKinMessageFlow({
  text,
  currentKin,
  kinLoading,
  setKinConnectionState,
  setKinLoading,
  pendingKinInjectionBlocks,
  pendingKinInjectionIndex,
  pendingKinInjectionPurpose = "none",
  setKinMessages,
  setKinInput,
  ingestProtocolMessage,
  processMultipartTaskDoneText,
  setPendingKinInjectionIndex,
  clearPendingKinInjection,
  onPendingKinAck,
  onSysTaskSent,
  onKinReply,
  kinSpeakerLabel,
  manageLoading = true,
  managePendingInjection = true,
  appendUserMessage = true,
}: RunSendKinMessageFlowArgs) {
  if (!text.trim() || !currentKin || (manageLoading && kinLoading)) return "";

  setKinConnectionState("idle");
  if (manageLoading) {
    setKinLoading(true);
  }

  const currentPendingBlock =
    pendingKinInjectionBlocks[pendingKinInjectionIndex] ?? null;

  if (appendUserMessage) {
    setKinMessages((prev) => [...prev, { id: generateId(), role: "user", text }]);
    setKinInput("");
    ingestProtocolMessage(text, "user_to_kin");
  }

  try {
    const res = await fetch("/api/kindroid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, kinId: currentKin }),
    });

    const data = (await res.json()) as KindroidApiResponse;
    if (text.includes("<<SYS_TASK>>")) {
      await onSysTaskSent?.(text);
    }

    const replyText =
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply
        : "Kin did not return a usable response.";

    setKinMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "kin",
        text: replyText,
        meta: kinSpeakerLabel ? { speakerLabel: kinSpeakerLabel } : undefined,
      },
    ]);
    if (typeof data.reply === "string" && data.reply.trim()) {
      ingestProtocolMessage(data.reply, "kin_to_gpt");
      processMultipartTaskDoneText(data.reply);
      await onKinReply?.(data.reply);
    }

    setKinConnectionState("connected");

    if (managePendingInjection) {
      const pendingAction = resolvePendingKinInjectionAction({
        text,
        currentPendingBlock,
        replyText,
        pendingKinInjectionIndex,
        pendingKinInjectionBlocks,
      });

      if (pendingAction.type === "advance") {
        setPendingKinInjectionIndex(pendingAction.nextIndex);
        setKinInput(pendingAction.nextInput);
      } else if (pendingAction.type === "complete") {
        clearPendingKinInjection();
        const shouldContinueTask = pendingKinInjectionPurpose === "task_context";
        if (shouldContinueTask) {
          await onPendingKinAck?.();
        }
        if (
          shouldContinueTask &&
          pendingAction.finalReplyNeedsTaskContinuation &&
          shouldPromptKinToContinueAfterPendingInfoDelivery(replyText)
        ) {
          setKinInput(buildContinueTaskAfterMultipartReceiptBlock());
        }
      }
    }

    if (managePendingInjection && pendingKinInjectionBlocks.length === 0) {
      const followupInput = resolveKinFollowupInput({
        replyText,
        outboundText: text,
      });
      if (followupInput) {
        setKinInput(followupInput);
      }
    }
    return replyText;
  } catch (error) {
    console.error(error);
    setKinConnectionState("error");
    if (pendingKinInjectionBlocks.length === 0) {
      setKinMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "kin",
          text: "Kin did not return a usable response.",
        },
      ]);
      setKinInput(
        resolveKinFollowupInput({
          replyText: "Kin did not return a usable response.",
          outboundText: text,
        })
      );
    }
    return "";
  } finally {
    if (manageLoading) {
      setKinLoading(false);
    }
  }
}
