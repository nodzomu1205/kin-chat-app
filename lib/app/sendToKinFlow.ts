import type { Dispatch, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import type { Message } from "@/types/chat";
import type { KinConnectionState } from "@/hooks/useKinManager";
import {
  buildProgressAckResponseBlock,
  buildResendLastMessageBlock,
  extractTaskProtocolEvents,
} from "@/lib/taskRuntimeProtocol";

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

function extractTaskIdFromOutboundText(text: string): string | undefined {
  const directMatch = text.match(/TASK_ID:\s*([^\n\r]+)/);
  if (directMatch?.[1]?.trim()) return directMatch[1].trim();

  const sysTaskMatch = text.match(/<<SYS_TASK>>[\s\S]*?#(\d{3,})/);
  if (sysTaskMatch?.[1]) return sysTaskMatch[1];

  return undefined;
}

function hasKinReceivedAck(text: string) {
  return /<<SYS_KIN_RESPONSE>>[\s\S]*?Received\.\s*Send the next(?: part)?\.[\s\S]*?<<(?:END_SYS_KIN_RESPONSE|END_SYS_RESPONSE)>>/i.test(
    text
  );
}

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

    const sentPendingPart =
      typeof currentPendingBlock === "string" && text === currentPendingBlock.trim();

    if (sentPendingPart && hasKinReceivedAck(replyText)) {
      const nextIndex = pendingKinInjectionIndex + 1;

      if (nextIndex < pendingKinInjectionBlocks.length) {
        setPendingKinInjectionIndex(nextIndex);
        setKinInput(pendingKinInjectionBlocks[nextIndex]);
      } else {
        clearPendingKinInjection();
        await onPendingKinAck?.();
      }
    }

    if (pendingKinInjectionBlocks.length === 0) {
      const events = extractTaskProtocolEvents(replyText);
      const hasProgress = events.some((event) => event.type === "task_progress");
      const hasOtherRequestLikeEvent = events.some(
        (event) =>
          event.type !== "task_progress" &&
          event.type !== "task_confirm"
      );
      const taskId = events.find((event) => event.taskId)?.taskId;

      if (hasProgress && taskId && !hasOtherRequestLikeEvent) {
        setKinInput(buildProgressAckResponseBlock({ taskId }));
      } else if (replyText === "Kin did not return a usable response.") {
        setKinInput(
          buildResendLastMessageBlock({
            taskId: extractTaskIdFromOutboundText(text),
          })
        );
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
        buildResendLastMessageBlock({
          taskId: extractTaskIdFromOutboundText(text),
        })
      );
    }
  } finally {
    setKinLoading(false);
  }
}
