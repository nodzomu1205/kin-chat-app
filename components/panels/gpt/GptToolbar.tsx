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
  onRunTaskUpdate: () => void;
  onImportLastResponse: () => void;
  onAttachSearchResult: () => void;
  onImportKinInstruction: () => void;
  onSendSysInfo: () => void;
  onTransfer: () => void;
  onReset: () => void;
};

const tabButtonStyle = (
  active: boolean,
  isMobile: boolean
): React.CSSProperties => ({
  height: isMobile ? 26 : 30,
  borderRadius: "10px 10px 0 0",
  border: "1px solid #cbd5e1",
  borderBottom: active ? "none" : "1px solid #cbd5e1",
  background: active ? "#ffffff" : "#f8fafc",
  color: active ? "#0f766e" : "#475569",
  fontSize: isMobile ? 11 : 12,
  fontWeight: 800,
  padding: isMobile ? "0 8px" : "0 12px",
  boxShadow: active ? "0 -2px 8px rgba(15,23,42,0.10)" : "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
});

const restoredButton = (base: React.CSSProperties): React.CSSProperties => ({
  ...base,
  whiteSpace: "nowrap",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  flexShrink: 0,
});

function BottomActions({
  activeTab,
  onAction,
  onRunTask,
  onRunDeepen,
  onRunTaskUpdate,
  onImportLastResponse,
  onAttachSearchResult,
  onImportKinInstruction,
  onSendSysInfo,
  onTransfer,
  onReset,
}: Omit<Props, "isMobile" | "onSwitchPanel" | "onChangeTab">) {
  if (activeTab === "chat") {
    return (
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

        <button type="button" style={restoredButton(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  if (activeTab === "task_primary") {
    return (
      <>
        <button type="button" style={restoredButton(buttonTask)} onClick={onRunTask}>
          新規
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
          style={restoredButton(buttonTask)}
          onClick={onRunTaskUpdate}
        >
          更新
        </button>

        <button
          type="button"
          style={restoredButton(buttonTransfer)}
          onClick={onTransfer}
        >
          Kinタスク
        </button>

        <button type="button" style={restoredButton(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  if (activeTab === "task_secondary") {
    return (
      <>
        <button
          type="button"
          style={restoredButton(buttonTask)}
          onClick={onImportLastResponse}
        >
          レス取込
        </button>

        <button
          type="button"
          style={restoredButton(buttonTask)}
          onClick={onAttachSearchResult}
        >
          検索統合
        </button>

        <button
          type="button"
          style={restoredButton(buttonTask)}
          onClick={onImportKinInstruction}
        >
          Kin指示
        </button>

        <button
          type="button"
          style={restoredButton(buttonTransfer)}
          onClick={onSendSysInfo}
        >
          SYS_INFO
        </button>

        <button
          type="button"
          style={restoredButton(buttonTransfer)}
          onClick={onTransfer}
        >
          Kinタスク
        </button>

        <button type="button" style={restoredButton(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#475569",
        padding: "0 4px",
        whiteSpace: "nowrap",
      }}
    >
      ファイル設定は下の取込エリアに表示中です。
    </div>
  );
}

export default function GptToolbar({
  activeTab,
  isMobile = false,
  onSwitchPanel,
  onChangeTab,
  onAction,
  onRunTask,
  onRunDeepen,
  onRunTaskUpdate,
  onImportLastResponse,
  onAttachSearchResult,
  onImportKinInstruction,
  onSendSysInfo,
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
          gap: 4,
          flexWrap: "nowrap",
          maxWidth: "calc(100% - 16px)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <button type="button" onClick={() => onChangeTab("chat")} style={tabButtonStyle(activeTab === "chat", isMobile)}>
          チャット
        </button>
        <button type="button" onClick={() => onChangeTab("task_primary")} style={tabButtonStyle(activeTab === "task_primary", isMobile)}>
          タスク①
        </button>
        <button type="button" onClick={() => onChangeTab("task_secondary")} style={tabButtonStyle(activeTab === "task_secondary", isMobile)}>
          タスク②
        </button>
        <button type="button" onClick={() => onChangeTab("file")} style={tabButtonStyle(activeTab === "file", isMobile)}>
          ファイル
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
          <button type="button" style={buttonSwitch} onClick={onSwitchPanel} title="Kinパネルへ切替">
            ⇄
          </button>
        )}

        <BottomActions
          activeTab={activeTab}
          onAction={onAction}
          onRunTask={onRunTask}
          onRunDeepen={onRunDeepen}
          onRunTaskUpdate={onRunTaskUpdate}
          onImportLastResponse={onImportLastResponse}
          onAttachSearchResult={onAttachSearchResult}
          onImportKinInstruction={onImportKinInstruction}
          onSendSysInfo={onSendSysInfo}
          onTransfer={onTransfer}
          onReset={onReset}
        />
      </div>
    </>
  );
}
