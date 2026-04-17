import React from "react";
import { pillButton, statusDotStyle } from "../gpt/gptPanelStyles";
import { KIN_PANEL_TEXT } from "./kinUiText";

type Props = {
  currentKinLabel: string | null;
  kinStatus: "idle" | "connected" | "error";
  onToggleKinList: () => void;
  onToggleConnectForm: () => void;
  isMobile?: boolean;
};

export default function KinHeader({
  currentKinLabel,
  kinStatus,
  onToggleKinList,
  onToggleConnectForm,
  isMobile = false,
}: Props) {
  return (
    <div
      style={{
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
    </div>
  );
}
