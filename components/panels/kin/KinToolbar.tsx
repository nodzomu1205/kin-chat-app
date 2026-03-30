import React from "react";
import { buttonReset, buttonSwitch, buttonTransfer } from "./kinPanelStyles";

type Props = {
  isMobile?: boolean;
  onSwitchPanel?: () => void;
  onTransfer: () => void;
  onReset: () => void;
};

export default function KinToolbar({
  isMobile = false,
  onSwitchPanel,
  onTransfer,
  onReset,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        overflowX: "auto",
        paddingBottom: 2,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {isMobile && onSwitchPanel && (
        <button type="button" style={buttonSwitch} onClick={onSwitchPanel} title="切替">
          ⇄
        </button>
      )}

      <button type="button" style={buttonTransfer} onClick={onTransfer}>
        GPTに送る
      </button>

      <button type="button" style={buttonReset} onClick={onReset} title="リセット">
        ↻
      </button>
    </div>
  );
}
