"use client";

import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type { ChatPageKinPanelCompositionArgs } from "@/hooks/chatPagePanelCompositionTypes";
import { resolvePendingInjectionProgress } from "@/lib/app/ui-state/panelPropsBuilders";

export function useChatPageKinPanelProps(
  args: ChatPageKinPanelCompositionArgs
): KinPanelProps {
  const pendingInjectionState = {
    blocks: args.kinState.pendingInjectionBlocks,
    index: args.kinState.pendingInjectionIndex,
  };
  const pendingInjectionProgress =
    resolvePendingInjectionProgress(pendingInjectionState);

  return {
    kinIdInput: args.kinState.kinIdInput,
    setKinIdInput: args.kinState.setKinIdInput,
    kinNameInput: args.kinState.kinNameInput,
    setKinNameInput: args.kinState.setKinNameInput,
    connectKin: args.controller.panel.handleConnectKin,
    disconnectKin: args.controller.panel.handleDisconnectKin,
    kinStatus: args.app.kinStatus as KinPanelProps["kinStatus"],
    currentKin: args.kinState.currentKin,
    currentKinLabel: args.app.currentKinLabel,
    kinList: args.app.kinList,
    selectedKinIds: args.kinState.selectedKinIds,
    switchKin: args.controller.panel.handleSwitchKin,
    toggleKinRecipient: args.kinState.toggleKinRecipient,
    selectAllKinRecipients: args.kinState.selectAllKinRecipients,
    removeKin: args.controller.panel.handleRemoveKin,
    renameKin: args.kinState.renameKin,
    kinMessages: args.kinState.kinMessages,
    kinInput: args.kinState.kinInput,
    setKinInput: args.kinState.setKinInput,
    sendKinMessage: args.controller.kin.sendKinMessage,
    sendToKin: args.controller.kin.sendToKin,
    sendKinToKinMessage: args.controller.kin.sendKinToKinMessage,
    requestKinToKinSummary: (text) =>
      args.controller.gpt.sendToGpt("normal", text),
    sendLastKinToGptDraft: args.controller.kin.sendLastKinToGptDraft,
    resetKinMessages: args.controller.panel.resetKinMessages,
    pendingInjectionCurrentPart: pendingInjectionProgress.currentPart,
    pendingInjectionTotalParts: pendingInjectionProgress.totalParts,
    kinBottomRef: args.kinState.kinBottomRef,
    isMobile: args.app.isMobile,
    onSwitchPanel: args.onSwitchToGptPanel,
    loading: args.kinState.loading,
  };
}
