import React from "react";
import type { GptTopDrawerTab } from "./gptPanelTypes";
import { pillButton, statusDotStyle } from "./gptPanelStyles";

type Props = {
  currentKinLabel: string | null;
  kinStatus: "idle" | "connected" | "error";
  activeDrawerTab: GptTopDrawerTab;
  onToggleMemory: () => void;
  onToggleToken: () => void;
  onToggleSettings: () => void;
  isMobile?: boolean;
};

export default function GptHeader({
  currentKinLabel,
  kinStatus,
  activeDrawerTab,
  onToggleSettings,
  isMobile = false,
}: Props) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 20,
        background: "#10a37f",
        color: "#fff",
        padding: isMobile ? "10px 12px" : "10px 14px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 18 : 16,
            fontWeight: 800,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          ChatGPT
        </div>

        <div
          style={{
            minWidth: 0,
            flexShrink: 1,
            fontSize: 14,
            fontWeight: 800,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={currentKinLabel || "Kin未選択"}
        >
          {currentKinLabel || "Kin未選択"}
        </div>

        <span style={statusDotStyle(kinStatus)} aria-label={kinStatus} />

        <div style={{ flex: 1 }} />

        <button
          type="button"
          style={{
            ...pillButton,
            background:
              activeDrawerTab === "settings"
                ? "rgba(255,255,255,0.22)"
                : pillButton.background,
          }}
          onClick={onToggleSettings}
        >
          設定
        </button>
      </div>
    </div>
  );
}