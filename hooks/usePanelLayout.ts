import { useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import {
  focusPanelIfSingleLayout,
  type ChatPanelTab,
  normalizeSinglePanelActiveTab,
} from "@/lib/app/panelLayout";

export function usePanelLayout(breakpoint = 1180) {
  const isSinglePanelLayout = useResponsive(breakpoint);
  const [activePanelTab, setActivePanelTab] = useState<ChatPanelTab>("kin");
  const normalizedActivePanelTab = normalizeSinglePanelActiveTab({
    isSinglePanelLayout,
    activeTab: activePanelTab,
  });

  return {
    isSinglePanelLayout,
    activePanelTab: normalizedActivePanelTab,
    setActivePanelTab,
    focusKinPanel: () =>
      focusPanelIfSingleLayout({
        isSinglePanelLayout,
        setActiveTab: setActivePanelTab,
        tab: "kin",
      }),
    focusGptPanel: () =>
      focusPanelIfSingleLayout({
        isSinglePanelLayout,
        setActiveTab: setActivePanelTab,
        tab: "gpt",
      }),
  };
}
