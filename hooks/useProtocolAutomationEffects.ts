import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import { containsSysProtocolBlock } from "@/lib/app/kin-protocol/protocolAutomation";
import { extractPreferredKinTransferText } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import {
  type PendingKinInjectionPurpose,
} from "@/lib/app/kin-protocol/kinMultipart";
import { applyKinSysInfoInjection } from "@/lib/app/kin-protocol/kinInfoInjection";

type AutoBridgeSettings = {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
};

export function resolveProtocolAutoSendAction(args: {
  input: string;
  enabled: boolean;
  loading: boolean;
  lastSentInput: string;
}) {
  const trimmed = args.input.trim();
  if (!trimmed) return { shouldSend: false, nextLastSentInput: "" };
  if (!args.enabled || args.loading || !containsSysProtocolBlock(trimmed)) {
    return { shouldSend: false, nextLastSentInput: args.lastSentInput };
  }
  if (args.lastSentInput === trimmed) {
    return { shouldSend: false, nextLastSentInput: args.lastSentInput };
  }
  return { shouldSend: true, nextLastSentInput: trimmed };
}

export type ProtocolAutomationEffectArgs = {
  autoBridgeSettings: AutoBridgeSettings;
  kinInput: string;
  gptInput: string;
  kinLoading: boolean;
  gptLoading: boolean;
  kinMessages: Message[];
  gptMessages: Message[];
  sendToKin: () => void | Promise<void>;
  sendToGpt: () => void | Promise<void>;
  setGptInput: (value: string) => void;
  setKinInput: (value: string) => void;
  setPendingKinInjectionBlocks?: (value: string[]) => void;
  setPendingKinInjectionIndex?: (value: number) => void;
  setPendingKinInjectionPurpose?: (value: PendingKinInjectionPurpose) => void;
  focusKinPanel: () => boolean;
  focusGptPanel: () => boolean;
};

function buildLibraryDataInfoTransferText(text: string) {
  const match = text.match(
    /<<SYS_LIBRARY_DATA_RESPONSE>>([\s\S]*?)<<END_SYS_LIBRARY_DATA_RESPONSE>>/i
  );
  const body = (match?.[1] || text).trim();

  return [
    "<<SYS_INFO>>",
    "TITLE: Library Data",
    "CONTENT:",
    body,
    "<<END_SYS_INFO>>",
  ].join("\n");
}

function applyTaskLibraryDataKinTransfer(args: {
  text: string;
  setKinInput: (value: string) => void;
  setPendingKinInjectionBlocks?: (value: string[]) => void;
  setPendingKinInjectionIndex?: (value: number) => void;
  setPendingKinInjectionPurpose?: (value: PendingKinInjectionPurpose) => void;
}) {
  if (!args.setPendingKinInjectionBlocks || !args.setPendingKinInjectionIndex) {
    args.setKinInput(buildLibraryDataInfoTransferText(args.text));
    args.setPendingKinInjectionPurpose?.("none");
    return;
  }

  applyKinSysInfoInjection({
    text: buildLibraryDataInfoTransferText(args.text),
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
    purpose: "task_context",
  });
}

export function useProtocolAutomationEffects(args: ProtocolAutomationEffectArgs) {
  const lastAutoSentKinInputRef = useRef("");
  const lastAutoSentGptInputRef = useRef("");
  const lastAutoCopiedKinMessageIdRef = useRef("");
  const lastAutoCopiedGptMessageIdRef = useRef("");

  useEffect(() => {
    const action = resolveProtocolAutoSendAction({
      input: args.kinInput,
      enabled: args.autoBridgeSettings.autoSendKinSysInput,
      loading: args.kinLoading,
      lastSentInput: lastAutoSentKinInputRef.current,
    });
    lastAutoSentKinInputRef.current = action.nextLastSentInput;
    if (!action.shouldSend) return;
    void args.sendToKin();
  }, [args]);

  useEffect(() => {
    const action = resolveProtocolAutoSendAction({
      input: args.gptInput,
      enabled: args.autoBridgeSettings.autoSendGptSysInput,
      loading: args.gptLoading,
      lastSentInput: lastAutoSentGptInputRef.current,
    });
    lastAutoSentGptInputRef.current = action.nextLastSentInput;
    if (!action.shouldSend) return;
    void args.sendToGpt();
  }, [args]);

  useEffect(() => {
    const latestKin = [...args.kinMessages].reverse().find((m) => m.role === "kin");
    if (!args.autoBridgeSettings.autoCopyKinSysResponseToGpt || !latestKin) return;
    if (!containsSysProtocolBlock(latestKin.text)) return;
    if (lastAutoCopiedKinMessageIdRef.current === latestKin.id) return;
    lastAutoCopiedKinMessageIdRef.current = latestKin.id;
    args.setGptInput(extractPreferredKinTransferText(latestKin.text));
    args.focusGptPanel();
  }, [args]);

  useEffect(() => {
    const latestGpt = [...args.gptMessages].reverse().find((m) => m.role === "gpt");
    if (!args.autoBridgeSettings.autoCopyGptSysResponseToKin || !latestGpt) return;
    if (!containsSysProtocolBlock(latestGpt.text)) return;
    if (lastAutoCopiedGptMessageIdRef.current === latestGpt.id) return;
    lastAutoCopiedGptMessageIdRef.current = latestGpt.id;
    if (latestGpt.text.includes("<<SYS_LIBRARY_DATA_RESPONSE>>")) {
      applyTaskLibraryDataKinTransfer({
        text: latestGpt.text,
        setKinInput: args.setKinInput,
        setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
        setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
        setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
      });
      args.focusKinPanel();
      return;
    }
    args.setKinInput(extractPreferredKinTransferText(latestGpt.text));
    args.setPendingKinInjectionBlocks?.([]);
    args.setPendingKinInjectionIndex?.(0);
    args.setPendingKinInjectionPurpose?.("none");
    args.focusKinPanel();
  }, [args]);
}
