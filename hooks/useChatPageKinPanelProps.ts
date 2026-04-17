"use client";

import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type { ChatPageKinPanelCompositionArgs } from "@/hooks/chatPagePanelCompositionTypes";
import { resolvePendingInjectionProgress } from "@/lib/app/panelPropsBuilders";

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
    switchKin: args.controller.panel.handleSwitchKin,
    removeKin: args.controller.panel.handleRemoveKin,
    renameKin: args.kinState.renameKin,
    kinMessages: args.kinState.kinMessages,
    kinInput: args.kinState.kinInput,
    setKinInput: args.kinState.setKinInput,
    sendToKin: args.controller.kin.sendToKin,
    sendLastKinToGptDraft: args.controller.kin.sendLastKinToGptDraft,
    resetKinMessages: args.controller.panel.resetKinMessages,
    pendingInjectionCurrentPart: pendingInjectionProgress.currentPart,
    pendingInjectionTotalParts: pendingInjectionProgress.totalParts,
    kinBottomRef: args.kinState.kinBottomRef,
    isMobile: args.app.isMobile,
    onSwitchPanel: args.activeTabSetter,
    loading: args.kinState.loading,
  };
}
