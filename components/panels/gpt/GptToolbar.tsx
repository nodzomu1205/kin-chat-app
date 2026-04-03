"use client";

import React from "react";
import type { GptBottomTab, GptInstructionMode } from "./gptPanelTypes";
import {
  buttonDeepen,
  buttonFile,
  buttonPolish,
  buttonReply,
  buttonReset,
  buttonSwitch,
  buttonTask,
  buttonTransfer,
  buttonTranslate,
} from "./gptPanelStyles";

type Props = {
  activeTab: GptBottomTab;
  isMobile?: boolean;
  onSwitchPanel?: () => void;
  onChangeTab: (tab: GptBottomTab) => void;
  onAction: (mode: GptInstructionMode) => void;
  onRunTask: () => void;
  onRunDeepen: () => void;
  onToggleFileTools: () => void;
  showFileTools: boolean;
  onTransfer: () => void;
  onReset: () => void;
};

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: "10px 10px 0 0",
  border: "1px solid #cbd5e1",
  borderBottom: active ? "none" : "1px solid #cbd5e1",
  background: active ? "#ffffff" : "#f8fafc",
  color: active ? "#0f766e" : "#475569",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 12px",
  boxShadow: active ? "0 -2px 8px rgba(15,23,42,0.10)" : "none",
  cursor: "pointer",
});

const restoredButton = (base: React.CSSProperties): React.CSSProperties => ({
  ...base,
  whiteSpace: "nowrap",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  flexShrink: 0,
});

export default function GptToolbar({
  activeTab,
  isMobile = false,
  onSwitchPanel,
  onChangeTab,
  onAction,
  onRunTask,
  onRunDeepen,
  onToggleFileTools,
  showFileTools,
  onTransfer,
  onReset,
}: Props) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: 12,
          top: 0,
          transform: "translateY(-100%)",
          zIndex: 40,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => onChangeTab("chat")}
          style={tabButtonStyle(activeTab === "chat")}
        >
          チャット
        </button>

        <button
          type="button"
          onClick={() => onChangeTab("task")}
          style={tabButtonStyle(activeTab === "task")}
        >
          タスク
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 2,
        }}
      >
        {isMobile && onSwitchPanel && (
          <button
            type="button"
            style={buttonSwitch}
            onClick={onSwitchPanel}
            title="Kinパネルへ切替"
          >
            ⇄
          </button>
        )}

        {activeTab === "chat" ? (
          <>
            <button
              type="button"
              style={restoredButton(buttonTranslate)}
              onClick={() => onAction("translate_explain")}
            >
              解説
            </button>

            <button
              type="button"
              style={restoredButton(buttonReply)}
              onClick={() => onAction("reply_only")}
            >
              返信案
            </button>

            <button
              type="button"
              style={restoredButton(buttonPolish)}
              onClick={() => onAction("polish")}
            >
              添削
            </button>

            <button
              type="button"
              style={restoredButton(buttonTransfer)}
              onClick={onTransfer}
            >
              Kinに送る
            </button>

            <button
              type="button"
              style={restoredButton(buttonReset)}
              onClick={onReset}
              title="リセット"
            >
              ↺
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              style={restoredButton(buttonTask)}
              onClick={onRunTask}
            >
              TASK
            </button>

            <button
              type="button"
              style={restoredButton(buttonDeepen)}
              onClick={onRunDeepen}
            >
              深堀り
            </button>

            <button
              type="button"
              style={restoredButton(buttonFile)}
              onClick={onToggleFileTools}
            >
              {showFileTools ? "FILE ▲" : "FILE"}
            </button>

            <button
              type="button"
              style={restoredButton(buttonTransfer)}
              onClick={onTransfer}
            >
              Kinに送る
            </button>

            <button
              type="button"
              style={restoredButton(buttonReset)}
              onClick={onReset}
              title="リセット"
            >
              ↺
            </button>
          </>
        )}
      </div>
    </>
  );
}