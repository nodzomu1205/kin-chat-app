import React from "react";
import type { GptInstructionMode } from "./gptPanelTypes";
import {
  buttonPolish,
  buttonReply,
  buttonSwitch,
  buttonTransfer,
  buttonTranslate,
  iconButton,
} from "./gptPanelStyles";

type Props = {
  isMobile?: boolean;
  onSwitchPanel?: () => void;
  onAction: (mode: GptInstructionMode) => void;
  onTransfer: () => void;
  onReset: () => void;
};

export default function GptToolbar({
  isMobile = false,
  onSwitchPanel,
  onAction,
  onTransfer,
  onReset,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        minHeight: 40,
        flexWrap: "nowrap",
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

      <button type="button" style={buttonTranslate} onClick={() => onAction("translate_explain")}>
        解説
      </button>

      <button type="button" style={buttonReply} onClick={() => onAction("reply_only")}>
        返信案
      </button>

      <button type="button" style={buttonPolish} onClick={() => onAction("polish")}>
        添削
      </button>

      <button type="button" style={buttonTransfer} onClick={onTransfer}>
        Kinに戻す
      </button>

      <button type="button" style={iconButton} onClick={onReset} title="リセット">
        ↻
      </button>
    </div>
  );
}
