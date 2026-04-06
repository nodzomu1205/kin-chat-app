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

const TAB_HEIGHT_DESKTOP = 21;
const TAB_HEIGHT_MOBILE = 19;

const tabButtonStyle = (active: boolean, isMobile: boolean): React.CSSProperties => ({
  height: isMobile ? TAB_HEIGHT_MOBILE : TAB_HEIGHT_DESKTOP,
  borderRadius: "9px 9px 0 0",
  border: "1px solid #cbd5e1",
  borderBottom: active ? "none" : "1px solid #cbd5e1",
  background: active ? "#ffffff" : "#f8fafc",
  color: active ? "#0f766e" : "#475569",
  fontSize: isMobile ? 10 : 11,
  fontWeight: 800,
  padding: isMobile ? "0 7px" : "0 8px",
  boxShadow: active ? "none" : "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  lineHeight: 1,
  boxSizing: "border-box",
  position: "relative",
  top: 0,
});

const resetLike = (base: React.CSSProperties): React.CSSProperties => ({
  ...base,
  whiteSpace: "nowrap",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  flexShrink: 0,
});

const tint = (
  base: React.CSSProperties,
  border: string,
  bg: string,
  color: string
): React.CSSProperties => ({
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
  const maybeSwitch =
    isMobile && onSwitchPanel ? (
      <button type="button" style={buttonSwitch} onClick={onSwitchPanel} title="画面切替">
        ⇄
      </button>
    ) : null;

  if (activeTab === "chat") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={resetLike(buttonTranslate)} onClick={() => onAction("translate_explain")}>
          解説
        </button>
        <button type="button" style={resetLike(buttonReply)} onClick={() => onAction("reply_only")}>
          返信案
        </button>
        <button type="button" style={resetLike(buttonPolish)} onClick={() => onAction("polish")}>
          添削
        </button>
        <button type="button" style={resetLike(buttonTransfer)} onClick={onTransfer}>
          Kinに送る
        </button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  if (activeTab === "task_primary") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={tint(buttonTask, "#93c5fd", "#eff6ff", "#1d4ed8")} onClick={onRunTask}>
          タスク化
        </button>
        <button type="button" style={tint(buttonTask, "#93c5fd", "#eff6ff", "#1d4ed8")} onClick={onRunTaskUpdate}>
          更新
        </button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  if (activeTab === "task_secondary") {
    return (
      <>
        {maybeSwitch}
        <button type="button" style={tint(buttonDeepen, "#86efac", "#f0fdf4", "#15803d")} onClick={onRunDeepen}>
          深掘り
        </button>
        <button type="button" style={tint(buttonTask, "#86efac", "#f0fdf4", "#15803d")} onClick={onImportLastResponse}>
          レス取込
        </button>
        <button type="button" style={tint(buttonTask, "#86efac", "#f0fdf4", "#15803d")} onClick={onAttachSearchResult}>
          検索追加
        </button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  if (activeTab === "kin") {
    return (
      <>
        {maybeSwitch}
        <button
          type="button"
          style={tint(buttonTransfer, "#d8b4fe", "#faf5ff", "#7e22ce")}
          onClick={onSendLatestResponseToKin}
        >
          レス送付
        </button>
        <button
          type="button"
          style={tint(buttonTransfer, "#d8b4fe", "#faf5ff", "#7e22ce")}
          onClick={onSendCurrentTaskToKin}
        >
          タスク送付
        </button>
        <button type="button" style={tint(buttonTask, "#d8b4fe", "#faf5ff", "#7e22ce")} onClick={onReceiveKinResponse}>
          レス受取
        </button>
        <button type="button" style={resetLike(buttonReset)} onClick={onReset}>
          ↺
        </button>
      </>
    );
  }

  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", padding: "0 4px" }}>
      ファイル取込は下の「挿入」エリアから実行できます。
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
          right: 0,
          top: 0,
          transform: isMobile
            ? "translateY(calc(-100% - 3px))"
            : "translateY(calc(-100% - 5px))",
          zIndex: 40,
          display: "flex",
          gap: 3,
          maxWidth: "100%",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: isMobile ? 3 : 5,
        }}
      >
        <button type="button" onClick={() => onChangeTab("chat")} style={tabButtonStyle(activeTab === "chat", isMobile)}>
          チャット
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("task_primary")}
          style={tabButtonStyle(activeTab === "task_primary", isMobile)}
        >
          タスク1
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("task_secondary")}
          style={tabButtonStyle(activeTab === "task_secondary", isMobile)}
        >
          タスク2
        </button>
        <button type="button" onClick={() => onChangeTab("kin")} style={tabButtonStyle(activeTab === "kin", isMobile)}>
          Kin
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
          flexWrap: "wrap",
          overflowX: "auto",
          scrollbarWidth: "none",
          minHeight: isMobile ? 34 : 32,
          paddingTop: isMobile ? 4 : 4,
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <ActionRow {...props} />
      </div>
    </>
  );
}
