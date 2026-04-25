import type { Dispatch, SetStateAction } from "react";
import { generateId } from "@/lib/shared/uuid";
import type { Message } from "@/types/chat";
import type { KinConnectionState } from "@/hooks/useKinManager";
import {
  resolveKinFollowupInput,
  resolvePendingKinInjectionAction,
} from "@/lib/app/kin-protocol/sendToKinFlowState";

type RunSendKinMessageFlowArgs = {
  text: string;
  currentKin: string | null;
  kinLoading: boolean;
  setKinConnectionState: Dispatch<SetStateAction<KinConnectionState>>;
  setKinLoading: Dispatch<SetStateAction<boolean>>;
  pendingKinInjectionBlocks: string[];
  pendingKinInjectionIndex: number;
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
  setKinMessages,
  setKinInput,
  ingestProtocolMessage,
  processMultipartTaskDoneText,
  setPendingKinInjectionIndex,
  clearPendingKinInjection,
  onPendingKinAck,
}: RunSendKinMessageFlowArgs) {
  if (!text.trim() || !currentKin || kinLoading) return;

  setKinConnectionState("idle");
  setKinLoading(true);

  const currentPendingBlock =
    pendingKinInjectionBlocks[pendingKinInjectionIndex] ?? null;

  setKinMessages((prev) => [...prev, { id: generateId(), role: "user", text }]);
  setKinInput("");
  ingestProtocolMessage(text, "user_to_kin");

  try {
    const res = await fetch("/api/kindroid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, kinId: currentKin }),
    });

    const data = (await res.json()) as KindroidApiResponse;

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
      },
    ]);
    if (typeof data.reply === "string" && data.reply.trim()) {
      ingestProtocolMessage(data.reply, "kin_to_gpt");
      processMultipartTaskDoneText(data.reply);
    }

    setKinConnectionState("connected");

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
      await onPendingKinAck?.();
    }

    if (pendingKinInjectionBlocks.length === 0) {
      const followupInput = resolveKinFollowupInput({
        replyText,
        outboundText: text,
      });
      if (followupInput) {
        setKinInput(followupInput);
      }
    }
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
  } finally {
    setKinLoading(false);
  }
}
