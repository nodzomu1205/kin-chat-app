"use client";

import type { ReactNode } from "react";

type ChatPanelsLayoutProps = {
  isSinglePanelLayout: boolean;
  activePanelTab: "kin" | "gpt";
  kinPanel: ReactNode;
  gptPanel: ReactNode;
};

export default function ChatPanelsLayout(props: ChatPanelsLayoutProps) {
  const { isSinglePanelLayout, activePanelTab, kinPanel, gptPanel } = props;

  return isSinglePanelLayout ? (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        position: "relative",
        overflow: "visible",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: activePanelTab === "kin" ? "flex" : "none",
          width: "100%",
        }}
      >
        {kinPanel}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: activePanelTab === "gpt" ? "flex" : "none",
          width: "100%",
        }}
      >
        {gptPanel}
      </div>
    </div>
  ) : (
    <>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{kinPanel}</div>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{gptPanel}</div>
    </>
  );
}
