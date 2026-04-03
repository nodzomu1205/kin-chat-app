"use client";

import React from "react";
import type { GptBottomTab, GptInstructionMode } from "./gptPanelTypes";
import {
  buttonDeepen,
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

const compactButton = (
  base: React.CSSProperties,
  isMobile: boolean
): React.CSSProperties => ({
  ...base,
  padding: isMobile ? "7px 9px" : base.padding,
  fontSize: isMobile ? 12 : (base.fontSize as number | undefined) ?? 13,
  borderRadius: 12,
  lineHeight: 1.15,
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
              style={compactButton(buttonTranslate, isMobile)}
              onClick={() => onAction("translate_explain")}
            >
              解説
            </button>

            <button
              type="button"
              style={compactButton(buttonReply, isMobile)}
              onClick={() => onAction("reply_only")}
            >
              返信案
            </button>

            <button
              type="button"
              style={compactButton(buttonPolish, isMobile)}
              onClick={() => onAction("polish")}
            >
              添削
            </button>

            <button
              type="button"
              style={compactButton(buttonTransfer, isMobile)}
              onClick={onTransfer}
            >
              Kinに送る
            </button>

            <button
              type="button"
              style={compactButton(buttonReset, isMobile)}
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
              style={compactButton(buttonTask, isMobile)}
              onClick={onRunTask}
            >
              TASK
            </button>

            <button
              type="button"
              style={compactButton(buttonDeepen, isMobile)}
              onClick={onRunDeepen}
            >
              深堀り
            </button>

            <button
              type="button"
              style={compactButton(buttonTask, isMobile)}
              onClick={onToggleFileTools}
            >
              {showFileTools ? "FILE ▲" : "FILE"}
            </button>

            <button
              type="button"
              style={compactButton(buttonTransfer, isMobile)}
              onClick={onTransfer}
            >
              Kinに送る
            </button>

            <button
              type="button"
              style={compactButton(buttonReset, isMobile)}
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