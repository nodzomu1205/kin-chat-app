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

      <button type="button" style={buttonTransfer} onClick={onTransfer}>
        {KIN_PANEL_TEXT.sendToGpt}
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
