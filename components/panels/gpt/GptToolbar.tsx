"use client";

import React from "react";
import type { GptInstructionMode } from "./gptPanelTypes";
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

type GptBottomTab = "chat" | "task_primary" | "task_secondary" | "kin" | "file";

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
  onSendLatestResponseToKin: () => void;
  onSendCurrentTaskToKin: () => void;
  onReceiveKinResponse: () => void;
  onTransfer: () => void;
  onReset: () => void;
};

const tabButtonStyle = (active: boolean, isMobile: boolean): React.CSSProperties => ({
  height: isMobile ? 22 : 24,
  borderRadius: "9px 9px 0 0",
  border: "1px solid #cbd5e1",
  borderBottom: active ? "1px solid #ffffff" : "1px solid #cbd5e1",
  background: active ? "#ffffff" : "#f8fafc",
  color: active ? "#0f766e" : "#475569",
  fontSize: isMobile ? 10 : 11,
  fontWeight: 800,
  padding: isMobile ? "0 7px" : "0 8px",
  boxShadow: active ? "0 -2px 6px rgba(15,23,42,0.08)" : "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  lineHeight: 1,
});

const resetLike = (base: React.CSSProperties): React.CSSProperties => ({
  ...base,
  whiteSpace: "nowrap",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  flexShrink: 0,
});

const tint = (base: React.CSSProperties, border: string, bg: string, color: string): React.CSSProperties => ({
  ...resetLike(base),
  border: `1px solid ${border}`,
  background: bg,
  color,
});

function ActionRow({
  activeTab,
  isMobile,
  onSwitchPanel,
  onAction,
  onRunTask,
  onRunDeepen,
  onRunTaskUpdate,
  onImportLastResponse,
  onAttachSearchResult,
  onSendLatestResponseToKin,
  onSendCurrentTaskToKin,
  onReceiveKinResponse,
  onTransfer,
  onReset,
}: Omit<Props, "onChangeTab">) {
  const maybeSwitch = isMobile && onSwitchPanel ? (
    <button type="button" style={buttonSwitch} onClick={onSwitchPanel} title="画面切替">
      ⇄
    </button>
  ) : null;

  if (activeTab === "chat") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={resetLike(buttonTranslate)} onClick={() => onAction("translate_explain")}>解説</button>
        <button type="button" style={resetLike(buttonReply)} onClick={() => onAction("reply_only")}>返信案</button>
        <button type="button" style={resetLike(buttonPolish)} onClick={() => onAction("polish")}>添削</button>
        <button type="button" style={resetLike(buttonTransfer)} onClick={onTransfer}>Kinに送る</button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>↺</button>
      </>
    );
  }

  if (activeTab === "task_primary") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={tint(buttonTask, "#93c5fd", "#eff6ff", "#1d4ed8")} onClick={onRunTask}>新規</button>
        <button type="button" style={tint(buttonTask, "#93c5fd", "#eff6ff", "#1d4ed8")} onClick={onRunTaskUpdate}>更新</button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>↺</button>
      </>
    );
  }

  if (activeTab === "task_secondary") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={tint(buttonDeepen, "#86efac", "#f0fdf4", "#15803d")} onClick={onRunDeepen}>深堀り</button>
        <button type="button" style={tint(buttonTask, "#86efac", "#f0fdf4", "#15803d")} onClick={onImportLastResponse}>レス取込</button>
        <button type="button" style={tint(buttonTask, "#86efac", "#f0fdf4", "#15803d")} onClick={onAttachSearchResult}>検索統合</button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>↺</button>
      </>
    );
  }

  if (activeTab === "kin") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={tint(buttonTransfer, "#d8b4fe", "#faf5ff", "#7e22ce")} onClick={onSendLatestResponseToKin}>レス内容</button>
        <button type="button" style={tint(buttonTransfer, "#d8b4fe", "#faf5ff", "#7e22ce")} onClick={onSendCurrentTaskToKin}>タスク内容</button>
        <button type="button" style={tint(buttonTask, "#d8b4fe", "#faf5ff", "#7e22ce")} onClick={onReceiveKinResponse}>レス受領</button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>↺</button>
      </>
    );
  }

  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", padding: "0 4px" }}>
      ファイル取込は下の注入エリアから実行します。
    </div>
  );
}

export default function GptToolbar(props: Props) {
  const { activeTab, isMobile = false, onChangeTab } = props;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          top: 0,
          height: 0,
          borderTop: "1px solid #cbd5e1",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 10,
          top: 0,
          transform: "translateY(calc(-100% + 1px))",
          zIndex: 40,
          display: "flex",
          gap: 3,
          maxWidth: "calc(100% - 20px)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <button type="button" onClick={() => onChangeTab("chat")} style={tabButtonStyle(activeTab === "chat", isMobile)}>チャット</button>
        <button type="button" onClick={() => onChangeTab("task_primary")} style={tabButtonStyle(activeTab === "task_primary", isMobile)}>タスク①</button>
        <button type="button" onClick={() => onChangeTab("task_secondary")} style={tabButtonStyle(activeTab === "task_secondary", isMobile)}>タスク②</button>
        <button type="button" onClick={() => onChangeTab("kin")} style={tabButtonStyle(activeTab === "kin", isMobile)}>Kin</button>
        <button type="button" onClick={() => onChangeTab("file")} style={tabButtonStyle(activeTab === "file", isMobile)}>ファイル</button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          overflowX: "auto",
          scrollbarWidth: "none",
          minHeight: 32,
          paddingTop: isMobile ? 4 : 6,
        }}
      >
        <ActionRow {...props} />
      </div>
    </>
  );
}
