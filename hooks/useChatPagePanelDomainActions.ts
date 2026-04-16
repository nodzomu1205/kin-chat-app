"use client";

import {
  usePanelResetActions,
  type PanelResetActionArgs,
} from "@/hooks/usePanelResetActions";
import {
  useProtocolAutomationEffects,
  type ProtocolAutomationEffectArgs,
} from "@/hooks/useProtocolAutomationEffects";

type PanelDomainAutomationArgs = Omit<
  ProtocolAutomationEffectArgs,
  "sendToKin" | "sendToGpt"
>;

type PanelDomainResetArgs = Omit<
  PanelResetActionArgs,
  "clearPendingKinInjection"
>;

export type UseChatPagePanelDomainActionsArgs = {
  protocolAutomation: PanelDomainAutomationArgs;
  panelReset: PanelDomainResetArgs;
  sendToKin: () => void | Promise<void>;
  sendToGpt: () => void | Promise<void>;
  clearPendingKinInjection: () => void;
};

export function useChatPagePanelDomainActions(
  args: UseChatPagePanelDomainActionsArgs
) {
  useProtocolAutomationEffects({
    ...args.protocolAutomation,
    sendToKin: args.sendToKin,
    sendToGpt: args.sendToGpt,
  });

  return usePanelResetActions({
    ...args.panelReset,
    clearPendingKinInjection: args.clearPendingKinInjection,
  });
}
