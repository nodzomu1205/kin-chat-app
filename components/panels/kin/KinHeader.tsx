import React from "react";
import type { KinStatus } from "./kinPanelTypes";
import { headerActionButton, statusDotStyle } from "./kinPanelStyles";

type Props = {
  currentKinLabel: string | null;
  kinStatus: KinStatus;
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
  const currentKinName = currentKinLabel || "未接続";

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #7a5aa6 0%, #8b6bb3 100%)",
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
          Kindroid
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
          title={currentKinName}
        >
          {currentKinName}
        </div>

        <span style={statusDotStyle(kinStatus)} aria-label={kinStatus} />

        <div style={{ flex: 1 }} />

        <button type="button" onClick={onToggleKinList} style={headerActionButton}>
          Kin一覧
        </button>

        <button type="button" onClick={onToggleConnectForm} style={headerActionButton}>
          +接続
        </button>
      </div>
    </div>
  );
}
