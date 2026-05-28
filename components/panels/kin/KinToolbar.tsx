import React from "react";
import {
  buttonReset,
  buttonSwitch,
  buttonTransfer,
} from "./kinPanelStyles";
import { KIN_PANEL_TEXT } from "./kinUiText";

type Props = {
  isMobile?: boolean;
  onSwitchPanel?: () => void;
  onTransfer: () => void;
  onReset: () => void;
};

function TransferIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 19.2c0-6.9 3.9-11.6 10.2-12.5V3.8c0-.7.8-1.1 1.3-.6l5.1 5.1c.4.4.4 1 0 1.4L16 14.8c-.5.5-1.3.1-1.3-.6v-3C9.8 11.8 7 14.5 5.8 19.4c-.2.8-1.3.7-1.3-.2Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const transferIconButton: React.CSSProperties = {
  ...buttonTransfer,
  width: 32,
  minWidth: 32,
  padding: 0,
  fontSize: 0,
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
        minHeight: 32,
        overflowX: "auto",
        paddingBottom: 2,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {isMobile && onSwitchPanel && (
        <button
          type="button"
          style={buttonSwitch}
          onClick={onSwitchPanel}
          title={KIN_PANEL_TEXT.switchTitle}
        >
          {KIN_PANEL_TEXT.switchButton}
        </button>
      )}

      <button
        type="button"
        style={transferIconButton}
        onClick={onTransfer}
        aria-label={KIN_PANEL_TEXT.sendToGpt}
        title={KIN_PANEL_TEXT.sendToGpt}
      >
        <TransferIcon />
      </button>

      <button
        type="button"
        style={buttonReset}
        onClick={onReset}
        title={KIN_PANEL_TEXT.resetTitle}
      >
        {KIN_PANEL_TEXT.resetButton}
      </button>
    </div>
  );
}
