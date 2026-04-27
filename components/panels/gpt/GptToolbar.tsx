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
import { GPT_TOOLBAR_TEXT } from "./gptUiText";
import { GPT_TOOLBAR_TEXT_OVERRIDES } from "./gptUiTextOverrides";

type GptBottomTab = "chat" | "task_primary" | "task_secondary" | "kin";

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
  onRegisterTask: () => void;
  onTransfer: () => void;
  onReset: () => void;
};

const TAB_HEIGHT_DESKTOP = 21;
const TAB_HEIGHT_MOBILE = 19;

const tabButtonStyle = (
  active: boolean,
  isMobile: boolean
): React.CSSProperties => ({
  height: isMobile ? TAB_HEIGHT_MOBILE : TAB_HEIGHT_DESKTOP,
  borderRadius: "9px 9px 0 0",
  border: "1px solid #cbd5e1",
  borderBottom: active ? "none" : "1px solid #cbd5e1",
  background: active ? "#ffffff" : "#f8fafc",
  color: active ? "#0f766e" : "#475569",
  fontSize: isMobile ? 10 : 11,
  fontWeight: 800,
  padding: isMobile ? "0 7px" : "0 8px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  lineHeight: 1,
  boxSizing: "border-box",
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
  onRegisterTask,
  onTransfer,
  onReset,
}: Omit<Props, "onChangeTab">) {
  const maybeSwitch =
    isMobile && onSwitchPanel ? (
      <button
        type="button"
        style={buttonSwitch}
        onClick={onSwitchPanel}
        title={GPT_TOOLBAR_TEXT.mobileSwitchTitle}
      >
        {GPT_TOOLBAR_TEXT.mobileSwitchButton}
      </button>
    ) : null;

  if (activeTab === "chat") {
    return (
      <>
        {maybeSwitch}
        <button
          type="button"
          style={resetLike(buttonTranslate)}
          onClick={() => onAction("translate_explain")}
        >
          {GPT_TOOLBAR_TEXT.translate}
        </button>
        <button
          type="button"
          style={resetLike(buttonReply)}
          onClick={() => onAction("reply_only")}
        >
          {GPT_TOOLBAR_TEXT.replyOnly}
        </button>
        <button
          type="button"
          style={resetLike(buttonPolish)}
          onClick={() => onAction("polish")}
        >
          {GPT_TOOLBAR_TEXT.polish}
        </button>
        <button
          type="button"
          style={resetLike(buttonTransfer)}
          onClick={onTransfer}
        >
          {GPT_TOOLBAR_TEXT.sendToKin}
        </button>
        <button
          type="button"
          style={resetLike(buttonReset)}
          onClick={onReset}
          title={GPT_TOOLBAR_TEXT.resetTitle}
        >
          {GPT_TOOLBAR_TEXT.reset}
        </button>
      </>
    );
  }

  if (activeTab === "task_primary") {
    return (
      <>
        {maybeSwitch}
        <button
          type="button"
          style={tint(buttonTask, "#93c5fd", "#eff6ff", "#1d4ed8")}
          onClick={onRunTask}
        >
          {GPT_TOOLBAR_TEXT.runTask}
        </button>
        <button
          type="button"
          style={tint(buttonTask, "#93c5fd", "#eff6ff", "#1d4ed8")}
          onClick={onRunTaskUpdate}
        >
          {GPT_TOOLBAR_TEXT.updateTask}
        </button>
        <button
          type="button"
          style={resetLike(buttonReset)}
          onClick={onReset}
          title={GPT_TOOLBAR_TEXT.resetTitle}
        >
          {GPT_TOOLBAR_TEXT.reset}
        </button>
      </>
    );
  }

  if (activeTab === "task_secondary") {
    return (
      <>
        {maybeSwitch}
        <button
          type="button"
          style={tint(buttonDeepen, "#86efac", "#f0fdf4", "#15803d")}
          onClick={onRunDeepen}
        >
          {GPT_TOOLBAR_TEXT.deepen}
        </button>
        <button
          type="button"
          style={tint(buttonTask, "#86efac", "#f0fdf4", "#15803d")}
          onClick={onImportLastResponse}
        >
          {GPT_TOOLBAR_TEXT.importResponse}
        </button>
        <button
          type="button"
          style={tint(buttonTask, "#86efac", "#f0fdf4", "#15803d")}
          onClick={onAttachSearchResult}
        >
          {GPT_TOOLBAR_TEXT_OVERRIDES.attachSearchResult}
        </button>
        <button
          type="button"
          style={resetLike(buttonReset)}
          onClick={onReset}
          title={GPT_TOOLBAR_TEXT.resetTitle}
        >
          {GPT_TOOLBAR_TEXT.reset}
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
          {GPT_TOOLBAR_TEXT.sendLatestResponse}
        </button>
        <button
          type="button"
          style={tint(buttonTransfer, "#d8b4fe", "#faf5ff", "#7e22ce")}
          onClick={onSendCurrentTaskToKin}
        >
          {GPT_TOOLBAR_TEXT.sendCurrentTask}
        </button>
        <button
          type="button"
          style={tint(buttonTask, "#d8b4fe", "#faf5ff", "#7e22ce")}
          onClick={onRegisterTask}
        >
          {GPT_TOOLBAR_TEXT.registerTask}
        </button>
        <button
          type="button"
          style={resetLike(buttonReset)}
          onClick={onReset}
          title={GPT_TOOLBAR_TEXT.resetTitle}
        >
          {GPT_TOOLBAR_TEXT.reset}
        </button>
      </>
    );
  }
  return null;
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
            ? "translateY(calc(-100% - 4px))"
            : "translateY(calc(-100% - 5px))",
          zIndex: 40,
          display: "flex",
          gap: 3,
          maxWidth: "100%",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: isMobile ? 4 : 5,
        }}
      >
        <button
          type="button"
          onClick={() => onChangeTab("chat")}
          style={tabButtonStyle(activeTab === "chat", isMobile)}
        >
          {GPT_TOOLBAR_TEXT.chatTab}
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("task_primary")}
          style={tabButtonStyle(activeTab === "task_primary", isMobile)}
        >
          {GPT_TOOLBAR_TEXT.taskPrimaryTab}
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("task_secondary")}
          style={tabButtonStyle(activeTab === "task_secondary", isMobile)}
        >
          {GPT_TOOLBAR_TEXT.taskSecondaryTab}
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("kin")}
          style={tabButtonStyle(activeTab === "kin", isMobile)}
        >
          {GPT_TOOLBAR_TEXT.kinTab}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 6 : 8,
          flexWrap: "nowrap",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          minHeight: 32,
          paddingTop: isMobile ? 0 : 4,
          paddingBottom: isMobile ? 2 : 0,
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <ActionRow {...props} />
      </div>
    </>
  );
}
