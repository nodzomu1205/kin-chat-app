import type React from "react";
import type { KinProfile, Message } from "@/types/chat";

export type KinStatus = "idle" | "connected" | "error";

export type KinPanelProps = {
  kinIdInput: string;
  setKinIdInput: (value: string) => void;
  kinNameInput: string;
  setKinNameInput: (value: string) => void;
  connectKin: () => void;
  disconnectKin: () => void;
  kinStatus: KinStatus;
  currentKin: string | null;
  currentKinLabel: string | null;
  kinList: KinProfile[];
  selectedKinIds: string[];
  switchKin: (id: string) => void;
  toggleKinRecipient: (id: string) => void;
  selectAllKinRecipients: () => void;
  removeKin: (id: string) => void;
  renameKin: (id: string, label: string) => void;
  kinMessages: Message[];
  kinInput: string;
  setKinInput: (value: string) => void;
  sendKinMessage: (
    text: string,
    options?: { userMessageText?: string }
  ) => Promise<void>;
  sendToKin: () => void;
  sendKinToKinMessage: (
    kinId: string,
    text: string,
    speakerLabel: string
  ) => Promise<string>;
  requestKinToKinSummary: (text: string) => void | Promise<void>;
  sendLastKinToGptDraft: () => void;
  resetKinMessages: () => void;
  pendingInjectionCurrentPart: number;
  pendingInjectionTotalParts: number;
  kinBottomRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
  onSwitchPanel?: () => void;
  loading: boolean;
};
