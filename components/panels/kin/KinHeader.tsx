import React from "react";
import { pillButton, statusDotStyle } from "../gpt/gptPanelStyles";
import { KIN_PANEL_TEXT } from "./kinUiText";

type Props = {
  currentKinLabel: string | null;
  kinStatus: "idle" | "connected" | "error";
  onToggleKinList: () => void;
  onToggleKinToKinChat: () => void;
  onToggleConnectForm: () => void;
  kinToKinChatOpen?: boolean;
  isMobile?: boolean;
};

export default function KinHeader({
  currentKinLabel,
  kinStatus,
  onToggleKinList,
  onToggleKinToKinChat,
  onToggleConnectForm,
  kinToKinChatOpen = false,
  isMobile = false,
}: Props) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 20,
        background: "#6d4f97",
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
          {KIN_PANEL_TEXT.brand}
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
          title={currentKinLabel || KIN_PANEL_TEXT.currentKinFallback}
        >
          {currentKinLabel || KIN_PANEL_TEXT.currentKinFallback}
        </div>

        <span style={statusDotStyle(kinStatus)} aria-label={kinStatus} />

        <div style={{ flex: 1 }} />

        <button type="button" style={pillButton} onClick={onToggleKinList}>
          {KIN_PANEL_TEXT.kinList}
        </button>

        <button type="button" style={pillButton} onClick={onToggleConnectForm}>
          {KIN_PANEL_TEXT.connect}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 0,
          borderTop: "1px solid rgba(255,255,255,0.32)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          transform: "translateY(calc(100% - 4px))",
          zIndex: 30,
          display: "flex",
          alignItems: "flex-start",
          maxWidth: "100%",
        }}
      >
        <button
          type="button"
          onClick={onToggleKinToKinChat}
          style={kinChatTabStyle(kinToKinChatOpen, isMobile)}
        >
          Kin間チャット
        </button>
      </div>
    </div>
  );
}

function kinChatTabStyle(
  active: boolean,
  isMobile: boolean
): React.CSSProperties {
  return {
    height: isMobile ? 22 : 24,
    borderRadius: "0 0 9px 9px",
    border: "1px solid #c4b5fd",
    borderTop: active ? "none" : "1px solid #c4b5fd",
    background: active ? "#ffffff" : "#f8fafc",
    color: active ? "#5b21b6" : "#475569",
    fontSize: isMobile ? 10 : 11,
    fontWeight: 800,
    padding: isMobile ? "0 7px" : "0 8px",
    boxShadow: active ? "0 4px 10px rgba(15,23,42,0.08)" : "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };
}
