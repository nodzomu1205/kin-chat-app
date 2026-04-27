import { extractPreferredKinTransferText } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import type { RunSendToGptFlowArgs } from "@/lib/app/send-to-gpt/sendToGptFlowArgTypes";
import { generateId } from "@/lib/shared/uuid";
import type { Message } from "@/types/chat";
import type { Dispatch, SetStateAction } from "react";

export function buildAskAiModeSearchInput(query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return "";
  return `Ask AI Mode: ${trimmedQuery}`;
}

export async function runStartAskAiModeSearchFlow(args: {
  query: string;
  searchLocation: string;
  buildCommonFlowArgs: () => RunSendToGptFlowArgs;
  runSendToGpt: (flowArgs: RunSendToGptFlowArgs) => Promise<void>;
}) {
  const gptInput = buildAskAiModeSearchInput(args.query);
  if (!gptInput) return;

  await args.runSendToGpt({
    ...args.buildCommonFlowArgs(),
    gptInput,
    searchMode: "ai",
    searchEngines: ["google_ai_mode"],
    searchLocation: args.searchLocation,
    instructionMode: "normal",
  });
}

export function runSendLastKinToGptDraftFlow(args: {
  kinMessages: Message[];
  setGptInput: (value: string) => void;
  focusGptPanel: () => void;
}) {
  const last = [...args.kinMessages].reverse().find((m) => m.role === "kin");
  if (!last) return;

  args.setGptInput(extractPreferredKinTransferText(last.text));
  args.focusGptPanel();
}

export function appendLastGptToKinInfoMessage(args: {
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
}) {
  args.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: "The latest GPT response is ready to transfer to Kin.",
      meta: {
        kind: "task_info",
        sourceType: "gpt_chat",
      },
    },
  ]);
}
