import { generateId } from "@/lib/shared/uuid";
import { runInlineUrlShortcut } from "@/lib/app/send-to-gpt/sendToGptShortcutFlows";
import { resolvePrePreparationGateDecision } from "@/lib/app/send-to-gpt/sendToGptFlowDecisionState";
import {
  buildInlineUrlGateContext,
  buildMultipartImportGateContext,
  buildProtocolLimitViolationGateContext,
  buildTaskDirectiveOnlyGateContext,
  buildYoutubeTranscriptGateContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowGateContextBuilders";
import type { Dispatch, SetStateAction } from "react";
import type { Message } from "@/types/chat";

export function handleMultipartImportGate(args: {
  rawText: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
}) {
  const multipartHandled = args.processMultipartTaskDoneText(args.rawText, {
    setGptTab: true,
  });
  if (!multipartHandled) return false;

  const importedMessage: Message = {
    id: generateId(),
    role: "user",
    text: args.rawText,
  };
  args.setGptMessages((prev) => [...prev, importedMessage]);
  args.setGptInput("");
  return true;
}

export async function runPrePreparationGates(args: {
  rawText: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  extractInlineUrlTarget: (text: string) => string | null;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  const multipartImportGateContext = buildMultipartImportGateContext({
    rawText: args.rawText,
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
  });
  if (
    multipartImportGateContext.multipartHandled &&
    handleMultipartImportGate({
      rawText: args.rawText,
      processMultipartTaskDoneText: args.processMultipartTaskDoneText,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
    })
  ) {
    return true;
  }
  const inlineUrlGateContext = buildInlineUrlGateContext({
    rawText: args.rawText,
    extractInlineUrlTarget: args.extractInlineUrlTarget,
  });
  const gateDecision = resolvePrePreparationGateDecision({
    multipartHandled: multipartImportGateContext.multipartHandled,
    inlineUrlTarget: inlineUrlGateContext.inlineUrlTarget,
  });

  if (gateDecision.type === "multipart_import") {
    return true;
  }

  if (gateDecision.type !== "inline_url") {
    return false;
  }

  await handleInlineUrlGate({
    rawText: args.rawText,
    inlineUrlTarget: inlineUrlGateContext.inlineUrlTarget as string,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });
  return true;
}

export async function handleInlineUrlGate(args: {
  rawText: string;
  inlineUrlTarget: string;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  await runInlineUrlShortcut({
    rawText: args.rawText,
    inlineUrlTarget: args.inlineUrlTarget,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });
}

export {
  buildInlineUrlGateContext,
  buildMultipartImportGateContext,
  buildProtocolLimitViolationGateContext,
  buildTaskDirectiveOnlyGateContext,
  buildYoutubeTranscriptGateContext,
};
export {
  handleProtocolLimitViolationGate,
  handleTaskDirectiveOnlyGate,
  handleYoutubeTranscriptGate,
  runPreparedRequestGates,
} from "@/lib/app/send-to-gpt/sendToGptPreparedRequestGates";

