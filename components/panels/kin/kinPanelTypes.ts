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
  switchKin: (id: string) => void;
  removeKin: (id: string) => void;
  renameKin: (id: string, label: string) => void;
  kinMessages: Message[];
  kinInput: string;
  setKinInput: (value: string) => void;
  sendToKin: () => void;
  sendLastKinToGptDraft: () => void;
  resetKinMessages: () => void;
  kinBottomRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
  onSwitchPanel?: () => void;
  loading: boolean;
};
