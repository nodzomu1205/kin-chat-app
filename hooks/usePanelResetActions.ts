import { useCallback } from "react";
import type { Message } from "@/types/chat";

export type PanelResetActionArgs = {
  setKinMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  resetTokenStats: () => void;
  clearPendingKinInjection: () => void;
  resetCurrentTaskDraft: () => void;
  focusKinPanel: () => boolean;
  connectKin: () => void;
  switchKin: (id: string) => void;
  disconnectKin: () => void;
  removeKinState: (id: string) => void;
  removeKin: (id: string) => void;
  resetGptForCurrentKin: () => void;
};

export function usePanelResetActions(args: PanelResetActionArgs) {
  const resetBothPanels = useCallback(() => {
    args.setKinMessages([]);
    args.setGptMessages([]);
    args.resetTokenStats();
    args.clearPendingKinInjection();
    args.resetCurrentTaskDraft();
    args.focusKinPanel();
  }, [args]);

  const handleConnectKin = useCallback(() => {
    args.connectKin();
    resetBothPanels();
  }, [args, resetBothPanels]);

  const handleSwitchKin = useCallback(
    (id: string) => {
      args.switchKin(id);
      resetBothPanels();
    },
    [args, resetBothPanels]
  );

  const handleDisconnectKin = useCallback(() => {
    args.disconnectKin();
    resetBothPanels();
  }, [args, resetBothPanels]);

  const handleRemoveKin = useCallback(
    (id: string) => {
      args.removeKinState(id);
      args.removeKin(id);
      resetBothPanels();
    },
    [args, resetBothPanels]
  );

  const resetKinMessages = useCallback(() => {
    args.setKinMessages([]);
    args.clearPendingKinInjection();
  }, [args]);

  const handleResetGpt = useCallback(() => {
    args.setGptMessages([]);
    args.resetGptForCurrentKin();
    args.resetTokenStats();
    args.resetCurrentTaskDraft();
  }, [args]);

  return {
    resetBothPanels,
    handleConnectKin,
    handleSwitchKin,
    handleDisconnectKin,
    handleRemoveKin,
    resetKinMessages,
    handleResetGpt,
  };
}
