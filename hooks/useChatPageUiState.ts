import { useRef, useState } from "react";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePanelLayout } from "@/hooks/usePanelLayout";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { Message } from "@/types/chat";

export function useChatPageUiState(mobileBreakpoint: number) {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [kinLoading, setKinLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [pendingKinInjectionBlocks, setPendingKinInjectionBlocks] = useState<
    string[]
  >([]);
  const [pendingKinInjectionIndex, setPendingKinInjectionIndex] = useState(0);
  const [pendingKinInjectionPurpose, setPendingKinInjectionPurpose] =
    useState<PendingKinInjectionPurpose>("none");
  const [, setCurrentSessionId] = useState<string | null>(null);

  const {
    isSinglePanelLayout,
    activePanelTab,
    setActivePanelTab,
    focusKinPanel,
    focusGptPanel,
  } = usePanelLayout(mobileBreakpoint);

  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

  return {
    kinMessages,
    setKinMessages,
    gptMessages,
    setGptMessages,
    kinInput,
    setKinInput,
    gptInput,
    setGptInput,
    kinLoading,
    setKinLoading,
    gptLoading,
    setGptLoading,
    ingestLoading,
    setIngestLoading,
    pendingKinInjectionBlocks,
    setPendingKinInjectionBlocks,
    pendingKinInjectionIndex,
    setPendingKinInjectionIndex,
    pendingKinInjectionPurpose,
    setPendingKinInjectionPurpose,
    setCurrentSessionId,
    isSinglePanelLayout,
    activePanelTab,
    setActivePanelTab,
    focusKinPanel,
    focusGptPanel,
    kinBottomRef,
    gptBottomRef,
  };
}
