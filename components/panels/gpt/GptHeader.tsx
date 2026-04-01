import React from "react";
import type { ResponseMode } from "./gptPanelTypes";
import { pillButton, statusDotStyle } from "./gptPanelStyles";

type Props = {
  currentKinLabel: string | null;
  kinStatus: "idle" | "connected" | "error";
  memoryUsed: number;
  memoryCapacity: number;
  responseMode: ResponseMode;
  showMeta: boolean;
  showSettings: boolean;
  onToggleMeta: () => void;
  onToggleSettings: () => void;
  onToggleResponseMode: () => void;
  isMobile?: boolean;
};

export default function GptHeader({
  currentKinLabel,
  kinStatus,
  memoryUsed,
  memoryCapacity,
  responseMode,
  showMeta,
  showSettings,
  onToggleMeta,
  onToggleSettings,
  onToggleResponseMode,
  isMobile = false,
}: Props) {
  return (
    <div
      style={{
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
              responseMode === "strict"
                ? "rgba(255,255,255,0.22)"
                : pillButton.background,
          }}
          onClick={onToggleResponseMode}
          title="strict は事実優先、creative は通常会話です。"
        >
          {responseMode === "strict" ? "STRICT" : "CREATIVE"}
        </button>

        <button
          type="button"
          style={{
            ...pillButton,
            background: showMeta ? "rgba(255,255,255,0.18)" : pillButton.background,
          }}
          onClick={onToggleMeta}
          title="直近チャット + ファクト + 好み の占有数です。"
        >
          メモリ {memoryUsed}/{memoryCapacity}
        </button>

        <button
          type="button"
          style={{
            ...pillButton,
            background: showSettings
              ? "rgba(255,255,255,0.18)"
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
