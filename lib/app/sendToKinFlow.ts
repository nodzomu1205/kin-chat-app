import type { Dispatch, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import type { Message } from "@/types/chat";
import type { KinConnectionState } from "@/hooks/useKinManager";
import {
  buildProgressAckResponseBlock,
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

    setKinMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "kin",
        text:
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply
            : "Kin did not return a usable response.",
      },
    ]);
    if (typeof data.reply === "string") {
      ingestProtocolMessage(data.reply, "kin_to_gpt");
      processMultipartTaskDoneText(data.reply);
    }

    setKinConnectionState("connected");

    const sentPendingPart =
      typeof currentPendingBlock === "string" && text === currentPendingBlock.trim();

    if (sentPendingPart) {
      const nextIndex = pendingKinInjectionIndex + 1;

      if (nextIndex < pendingKinInjectionBlocks.length) {
        setPendingKinInjectionIndex(nextIndex);
        setKinInput(pendingKinInjectionBlocks[nextIndex]);
      } else {
        clearPendingKinInjection();
      }
    }

    if (
      typeof data.reply === "string" &&
      pendingKinInjectionBlocks.length === 0
    ) {
      const events = extractTaskProtocolEvents(data.reply);
      const progressOnly =
        events.length > 0 && events.every((event) => event.type === "task_progress");
      const taskId = events.find((event) => event.taskId)?.taskId;

      if (progressOnly && taskId) {
        setKinInput(buildProgressAckResponseBlock({ taskId }));
      }
    }
  } catch (error) {
    console.error(error);
    setKinConnectionState("error");
  } finally {
    setKinLoading(false);
  }
}
