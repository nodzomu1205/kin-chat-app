"use client";

import type { ReactNode } from "react";
import ChatPanelsLayout from "@/components/layout/ChatPanelsLayout";

type ChatAppShellProps = {
  isSinglePanelLayout: boolean;
  activePanelTab: "kin" | "gpt";
  kinPanel: ReactNode;
  gptPanel: ReactNode;
};

export default function ChatAppShell(props: ChatAppShellProps) {
  const { isSinglePanelLayout, activePanelTab, kinPanel, gptPanel } = props;

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        backgroundPosition: "top left",
        overflow: "visible",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isSinglePanelLayout ? 0 : 12,
          padding: isSinglePanelLayout ? 0 : 12,
          overflow: "visible",
        }}
      >
        <ChatPanelsLayout
          isSinglePanelLayout={isSinglePanelLayout}
          activePanelTab={activePanelTab}
          kinPanel={kinPanel}
          gptPanel={gptPanel}
        />
      </div>
    </div>
  );
}
