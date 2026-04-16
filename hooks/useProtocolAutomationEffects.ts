import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import { containsSysProtocolBlock } from "@/lib/app/protocolAutomation";
import { extractPreferredKinTransferText } from "@/lib/app/kinStructuredProtocol";

type AutoBridgeSettings = {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
};

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
  isMobile: boolean;
  setActiveTab: (tab: "kin" | "gpt") => void;
};

export function useProtocolAutomationEffects(args: ProtocolAutomationEffectArgs) {
  const lastAutoSentKinInputRef = useRef("");
  const lastAutoSentGptInputRef = useRef("");
  const lastAutoCopiedKinMessageIdRef = useRef("");
  const lastAutoCopiedGptMessageIdRef = useRef("");

  useEffect(() => {
    const trimmed = args.kinInput.trim();
    if (!args.autoBridgeSettings.autoSendKinSysInput || !trimmed || args.kinLoading) return;
    if (!containsSysProtocolBlock(trimmed)) return;
    if (lastAutoSentKinInputRef.current === trimmed) return;
    lastAutoSentKinInputRef.current = trimmed;
    void args.sendToKin();
  }, [args]);

  useEffect(() => {
    const trimmed = args.gptInput.trim();
    if (!args.autoBridgeSettings.autoSendGptSysInput || !trimmed || args.gptLoading) return;
    if (!containsSysProtocolBlock(trimmed)) return;
    if (lastAutoSentGptInputRef.current === trimmed) return;
    lastAutoSentGptInputRef.current = trimmed;
    void args.sendToGpt();
  }, [args]);

  useEffect(() => {
    const latestKin = [...args.kinMessages].reverse().find((m) => m.role === "kin");
    if (!args.autoBridgeSettings.autoCopyKinSysResponseToGpt || !latestKin) return;
    if (!containsSysProtocolBlock(latestKin.text)) return;
    if (lastAutoCopiedKinMessageIdRef.current === latestKin.id) return;
    lastAutoCopiedKinMessageIdRef.current = latestKin.id;
    args.setGptInput(extractPreferredKinTransferText(latestKin.text));
    if (args.isMobile) args.setActiveTab("gpt");
  }, [args]);

  useEffect(() => {
    const latestGpt = [...args.gptMessages].reverse().find((m) => m.role === "gpt");
    if (!args.autoBridgeSettings.autoCopyGptSysResponseToKin || !latestGpt) return;
    if (!containsSysProtocolBlock(latestGpt.text)) return;
    if (lastAutoCopiedGptMessageIdRef.current === latestGpt.id) return;
    lastAutoCopiedGptMessageIdRef.current = latestGpt.id;
    args.setKinInput(extractPreferredKinTransferText(latestGpt.text));
    if (args.isMobile) args.setActiveTab("kin");
  }, [args]);
}
