"use client";

import React, { useMemo, useState } from "react";
import type { TaskDraft } from "@/types/task";
import {
  tokenCardStyle,
  tokenLeftLabelStyle,
  tokenMetaStyle,
} from "./gptPanelStyles";
import { GPT_TASK_TEXT } from "./gptUiText";

const statusLabelMap = {
  idle: GPT_TASK_TEXT.status.idle,
  prepared: GPT_TASK_TEXT.status.prepared,
  deepened: GPT_TASK_TEXT.status.deepened,
  formatted: GPT_TASK_TEXT.status.formatted,
} as const;

const buttonStyle: React.CSSProperties = {
  height: 30,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 10px",
  cursor: "pointer",
};

const navButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: 13,
  color: "#0f172a",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: 13,
  color: "#0f172a",
  background: "#ffffff",
  outline: "none",
  resize: "vertical",
  lineHeight: 1.6,
  boxSizing: "border-box",
};

function formatUpdatedAt(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  taskDraft: TaskDraft;
  taskDraftCount: number;
  activeTaskDraftIndex: number;
  onChangeTaskTitle: (value: string) => void;
  onChangeTaskUserInstruction: (value: string) => void;
  onChangeTaskBody: (value: string) => void;
  onSaveTaskSnapshot?: () => void;
  onSelectPreviousTaskDraft?: () => void;
  onSelectNextTaskDraft?: () => void;
  onResetTaskContext?: () => void;
  isMobile?: boolean;
};

export default function GptTaskStatusDrawer({
  taskDraft,
  taskDraftCount,
  activeTaskDraftIndex,
  onChangeTaskTitle,
  onChangeTaskUserInstruction,
  onChangeTaskBody,
  onSaveTaskSnapshot,
  onSelectPreviousTaskDraft,
  onSelectNextTaskDraft,
  onResetTaskContext,
  isMobile = false,
}: Props) {
  const [editPolicyOpen, setEditPolicyOpen] = useState(false);
  const [editBodyOpen, setEditBodyOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  const latestSource =
    taskDraft.sources.length > 0
      ? taskDraft.sources[taskDraft.sources.length - 1]
      : null;

  const taskIdLabel = `#${String(
    taskDraft.slot && taskDraft.slot > 0 ? taskDraft.slot : 1
  ).padStart(2, "0")}`;
  const taskName =
    taskDraft.title || taskDraft.taskName || GPT_TASK_TEXT.status.unset;
  const latestLabel = latestSource?.label || "-";
  const latestType = latestSource?.type || "-";

  const hasTask =
    !!taskDraft.body.trim() ||
    !!taskDraft.prepText.trim() ||
    !!taskDraft.deepenText.trim() ||
    !!taskDraft.mergedText.trim() ||
    taskDraft.sources.length > 0;

  const instructionPreview = useMemo(() => {
    const text = taskDraft.userInstruction?.trim() || "";
    if (!text) return "-";
    return text.length > 80 ? `${text.slice(0, 80)}...` : text;
  }, [taskDraft.userInstruction]);

  const bodyPreview = useMemo(() => {
    const text =
      taskDraft.body?.trim() ||
      taskDraft.mergedText?.trim() ||
      taskDraft.deepenText?.trim() ||
      taskDraft.prepText?.trim() ||
      "";
    if (!text) return GPT_TASK_TEXT.status.emptyBody;
    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
  }, [
    taskDraft.body,
    taskDraft.mergedText,
    taskDraft.deepenText,
    taskDraft.prepText,
  ]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <div style={tokenCardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={tokenLeftLabelStyle}>{GPT_TASK_TEXT.status.taskSwitch}</div>
            <div style={{ ...tokenMetaStyle, marginTop: 4 }}>
              {activeTaskDraftIndex + 1} / {taskDraftCount}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={onSelectPreviousTaskDraft}
              disabled={!onSelectPreviousTaskDraft || activeTaskDraftIndex <= 0}
              style={{
                ...navButtonStyle,
                opacity: activeTaskDraftIndex > 0 ? 1 : 0.45,
                cursor: activeTaskDraftIndex > 0 ? "pointer" : "not-allowed",
              }}
            >
              {"<"}
            </button>
            <div
              style={{
                minWidth: 96,
                textAlign: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {taskIdLabel}
            </div>
            <button
              type="button"
              onClick={onSelectNextTaskDraft}
              disabled={!onSelectNextTaskDraft}
              style={navButtonStyle}
            >
              {">"}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
          {GPT_TASK_TEXT.status.moveHint}
        </div>
      </div>

      <div style={tokenCardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div style={tokenLeftLabelStyle}>{GPT_TASK_TEXT.status.currentTask}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={tokenMetaStyle}>
              {GPT_TASK_TEXT.status.keepingCountPrefix}
              {taskDraftCount}
              {GPT_TASK_TEXT.status.keepingCountSuffix}
            </div>
            {onSaveTaskSnapshot ? (
              <button
                type="button"
                onClick={() => {
                  onSaveTaskSnapshot();
                  setSaveNotice(GPT_TASK_TEXT.status.savedToLibrary);
                }}
                style={buttonStyle}
              >
                {GPT_TASK_TEXT.status.save}
              </button>
            ) : null}
            {onResetTaskContext ? (
              <button type="button" onClick={onResetTaskContext} style={buttonStyle}>
                {GPT_TASK_TEXT.status.clear}
              </button>
            ) : null}
          </div>
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.45,
            marginBottom: 10,
            wordBreak: "break-word",
          }}
        >
          {taskIdLabel} {taskName}
        </div>

        {saveNotice ? (
          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 700,
              color: "#0f766e",
            }}
          >
            {saveNotice}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(84px, auto) 1fr",
            gap: "6px 10px",
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.state}</div>
          <div>{statusLabelMap[taskDraft.status]}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>TASK_ID</div>
          <div>{taskIdLabel}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.taskName}</div>
          <div>{taskName}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.instruction}</div>
          <div>{instructionPreview}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.searchQuery}</div>
          <div>{taskDraft.searchContext?.query || "-"}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.sourceCount}</div>
          <div>
            {taskDraft.sources.length}
            {GPT_TASK_TEXT.status.keepingCountSuffix}
          </div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.latestSource}</div>
          <div>{latestLabel}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.sourceType}</div>
          <div>{latestType}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.updatedAt}</div>
          <div suppressHydrationWarning>{formatUpdatedAt(taskDraft.updatedAt)}</div>
          <div style={{ fontWeight: 800, color: "#334155" }}>{GPT_TASK_TEXT.status.kinTransfer}</div>
          <div>
            {taskDraft.kinTaskText.trim()
              ? GPT_TASK_TEXT.status.transferReady
              : GPT_TASK_TEXT.status.idle}
          </div>
        </div>
      </div>

      <div style={tokenCardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div style={tokenLeftLabelStyle}>{GPT_TASK_TEXT.status.policyEdit}</div>
          <button
            type="button"
            onClick={() => setEditPolicyOpen((prev) => !prev)}
            style={buttonStyle}
          >
            {editPolicyOpen ? GPT_TASK_TEXT.status.close : GPT_TASK_TEXT.status.edit}
          </button>
        </div>

        {!editPolicyOpen ? (
          <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
            {GPT_TASK_TEXT.status.editHint}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                {GPT_TASK_TEXT.editor.title}
              </div>
              <input
                value={taskDraft.title || ""}
                onChange={(event) => onChangeTaskTitle(event.target.value)}
                placeholder={GPT_TASK_TEXT.status.titlePlaceholder}
                style={inputStyle}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                {GPT_TASK_TEXT.status.instruction}
              </div>
              <textarea
                value={taskDraft.userInstruction || ""}
                onChange={(event) => onChangeTaskUserInstruction(event.target.value)}
                placeholder={GPT_TASK_TEXT.status.instructionPlaceholder}
                rows={isMobile ? 4 : 3}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onChangeTaskUserInstruction("")}
                style={buttonStyle}
              >
                {GPT_TASK_TEXT.status.clearInstruction}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={tokenCardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div style={tokenLeftLabelStyle}>{GPT_TASK_TEXT.status.aiBody}</div>
          <button
            type="button"
            onClick={() => setEditBodyOpen((prev) => !prev)}
            style={buttonStyle}
          >
            {editBodyOpen ? GPT_TASK_TEXT.status.close : GPT_TASK_TEXT.status.editBody}
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            marginBottom: editBodyOpen ? 10 : 0,
          }}
        >
          {bodyPreview}
        </div>

        {editBodyOpen ? (
          <textarea
            value={taskDraft.body || ""}
            onChange={(event) => onChangeTaskBody(event.target.value)}
            placeholder={GPT_TASK_TEXT.status.bodyPlaceholder}
            rows={isMobile ? 10 : 12}
            style={textareaStyle}
          />
        ) : null}
      </div>

      <div style={tokenCardStyle}>
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>
          {GPT_TASK_TEXT.status.description}
        </div>
        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          {hasTask
            ? GPT_TASK_TEXT.status.descriptionHasTask
            : GPT_TASK_TEXT.status.descriptionEmpty}
        </div>
      </div>
    </div>
  );
}
