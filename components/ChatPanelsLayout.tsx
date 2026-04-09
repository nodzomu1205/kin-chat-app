"use client";

import type { ReactNode } from "react";

type ChatPanelsLayoutProps = {
  isMobile: boolean;
  activeTab: "kin" | "gpt";
  kinPanel: ReactNode;
  gptPanel: ReactNode;
};

export default function ChatPanelsLayout(props: ChatPanelsLayoutProps) {
  const { isMobile, activeTab, kinPanel, gptPanel } = props;

  return isMobile ? (
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
          display: activeTab === "kin" ? "flex" : "none",
          width: "100%",
        }}
      >
        {kinPanel}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: activeTab === "gpt" ? "flex" : "none",
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
