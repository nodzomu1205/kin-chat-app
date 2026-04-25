"use client";

import React from "react";
import {
  countText,
  sectionCardStyle,
} from "@/components/panels/gpt/gptDrawerShared";
import { GPT_TASK_TEXT } from "@/components/panels/gpt/gptUiText";
import type {
  TaskRequirementProgress,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

export function statusBadgeStyle(status: string): React.CSSProperties {
  if (status === "suspended") {
    return {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "4px 10px",
      background: "#fff7ed",
      color: "#c2410c",
      fontSize: 12,
      fontWeight: 700,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 10px",
    background: "#ecfeff",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 700,
  };
}

export function actionButtonStyle(
  tone: "default" | "teal" | "amber" = "default"
): React.CSSProperties {
  if (tone === "teal") {
    return {
      border: "1px solid #bae6fd",
      background: "#f0f9ff",
      borderRadius: 8,
      padding: "5px 8px",
      cursor: "pointer",
      color: "#0f766e",
      fontWeight: 700,
      fontSize: 12,
    };
  }

  if (tone === "amber") {
    return {
      border: "1px solid #fdba74",
      background: "#fff7ed",
      borderRadius: 8,
      padding: "7px 10px",
      cursor: "pointer",
      color: "#c2410c",
      fontWeight: 700,
      fontSize: 12,
    };
  }

  return {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 8,
    padding: "5px 8px",
    cursor: "pointer",
    color: "#334155",
    fontWeight: 700,
    fontSize: 12,
  };
}

const editorInputStyle: React.CSSProperties = {
  width: 56,
  height: 30,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "0 8px",
  fontSize: 12,
  color: "#334155",
  background: "#fff",
  boxSizing: "border-box",
};

const taskProgressTextareaStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 10,
  borderRadius: 12,
  padding: 10,
  resize: "vertical",
  fontSize: 13,
  color: "#334155",
  background: "#fff",
  boxSizing: "border-box",
};

export function TaskProgressSyncSection(props: {
  hasActiveTask: boolean;
  syncNote: string;
  onChangeSyncNote: (value: string) => void;
  onBuildSyncNote: () => void;
  onClearSyncNote: () => void;
  onPrepareTaskSync: (note: string) => void;
}) {
  const canSend = props.hasActiveTask && !!props.syncNote.trim();

  return (
    <section style={sectionCardStyle}>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>
        {GPT_TASK_TEXT.progress.syncTitle}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
        {GPT_TASK_TEXT.progress.syncHelp}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button type="button" onClick={props.onBuildSyncNote} style={actionButtonStyle("teal")}>
          {GPT_TASK_TEXT.progress.syncBuild}
        </button>
        <button type="button" onClick={props.onClearSyncNote} style={actionButtonStyle("default")}>
          {GPT_TASK_TEXT.progress.clear}
        </button>
      </div>
      <textarea
        value={props.syncNote}
        onChange={(event) => props.onChangeSyncNote(event.target.value)}
        placeholder={GPT_TASK_TEXT.progress.syncPlaceholder}
        style={{
          ...taskProgressTextareaStyle,
          minHeight: 120,
          border: "1px solid #dbe4e8",
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
        }}
      />
      <button
        type="button"
        onClick={() => props.onPrepareTaskSync(props.syncNote)}
        disabled={!canSend}
        style={{
          marginTop: 10,
          ...actionButtonStyle("default"),
          padding: "7px 10px",
          opacity: canSend ? 1 : 0.5,
          cursor: canSend ? "pointer" : "not-allowed",
        }}
      >
        {GPT_TASK_TEXT.progress.setKinDraft}
      </button>
      {!props.hasActiveTask ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
          {GPT_TASK_TEXT.progress.missingTaskId}
        </div>
      ) : null}
    </section>
  );
}

export function TaskProgressSuspendSection(props: {
  hasActiveTask: boolean;
  suspendNote: string;
  onChangeSuspendNote: (value: string) => void;
  onPrepareTaskSuspend: (note: string) => void;
}) {
  return (
    <section style={sectionCardStyle}>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>
        {GPT_TASK_TEXT.progress.suspendTitle}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
        {GPT_TASK_TEXT.progress.suspendHelp}
      </div>
      <textarea
        value={props.suspendNote}
        onChange={(event) => props.onChangeSuspendNote(event.target.value)}
        placeholder={GPT_TASK_TEXT.progress.suspendPlaceholder}
        style={{
          ...taskProgressTextareaStyle,
          minHeight: 72,
          border: "1px solid #fed7aa",
        }}
      />
      <button
        type="button"
        onClick={() => props.onPrepareTaskSuspend(props.suspendNote)}
        disabled={!props.hasActiveTask}
        style={{
          marginTop: 10,
          ...actionButtonStyle("amber"),
          opacity: props.hasActiveTask ? 1 : 0.5,
          cursor: props.hasActiveTask ? "pointer" : "not-allowed",
        }}
      >
        {GPT_TASK_TEXT.progress.suspendSet}
      </button>
      {!props.hasActiveTask ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
          {GPT_TASK_TEXT.progress.missingTaskId}
        </div>
      ) : null}
    </section>
  );
}

export function RequirementProgressCard(props: {
  item: TaskRequirementProgress;
  isEditing: boolean;
  editingCompletedCount: string;
  editingTargetCount: string;
  canEdit: boolean;
  onBeginEdit: (
    requirementId: string,
    completedCount?: number,
    targetCount?: number
  ) => void;
  onChangeCompletedCount: (value: string) => void;
  onChangeTargetCount: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { item } = props;

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        border: "1px solid #eef2f7",
        borderRadius: 14,
        padding: "10px 12px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ color: "#334155", lineHeight: 1.55 }}>{item.label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              flexShrink: 0,
              fontSize: 12,
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            {countText(item.completedCount, item.targetCount, item.status)}
          </div>
          {props.canEdit ? (
            <button
              type="button"
              onClick={() =>
                props.onBeginEdit(item.id, item.completedCount, item.targetCount)
              }
              style={actionButtonStyle("default")}
            >
              {GPT_TASK_TEXT.progress.edit}
            </button>
          ) : null}
        </div>
      </div>
      {props.isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {GPT_TASK_TEXT.progress.completed}
          </span>
          <input
            value={props.editingCompletedCount}
            onChange={(event) => props.onChangeCompletedCount(event.target.value)}
            style={editorInputStyle}
          />
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {GPT_TASK_TEXT.progress.target}
          </span>
          <input
            value={props.editingTargetCount}
            onChange={(event) => props.onChangeTargetCount(event.target.value)}
            style={editorInputStyle}
          />
          <button type="button" onClick={props.onCommitEdit} style={actionButtonStyle("teal")}>
            {GPT_TASK_TEXT.progress.apply}
          </button>
          <button type="button" onClick={props.onCancelEdit} style={actionButtonStyle("default")}>
            {GPT_TASK_TEXT.progress.close}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function UserFacingRequestCard(props: {
  request: UserFacingTaskRequest;
  onAnswerTaskRequest?: (requestId: string) => void;
  onPrepareTaskRequestAck?: (requestId: string) => void;
}) {
  const { request } = props;

  return (
    <div
      style={{
        border: "1px solid #eef2f7",
        borderRadius: 14,
        padding: "10px 12px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "#334155" }}>
          [{request.requestId}]{" "}
          {request.kind === "question"
            ? GPT_TASK_TEXT.progress.question
            : GPT_TASK_TEXT.progress.materialRequest}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{request.status}</div>
      </div>
      <div
        style={{
          marginTop: 6,
          whiteSpace: "pre-wrap",
          color: "#334155",
          lineHeight: 1.6,
        }}
      >
        {request.body}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          fontSize: 12,
          color: "#64748b",
          flexWrap: "wrap",
        }}
      >
        <span>
          {request.required
            ? GPT_TASK_TEXT.progress.requiredShort
            : GPT_TASK_TEXT.progress.optionalShort}
        </span>
        <span>ACTION: {request.actionId}</span>
        {props.onAnswerTaskRequest ? (
          <button
            type="button"
            onClick={() => props.onAnswerTaskRequest?.(request.requestId)}
            style={actionButtonStyle("default")}
          >
            {GPT_TASK_TEXT.progress.answerThis}
          </button>
        ) : null}
        {props.onPrepareTaskRequestAck ? (
          <button
            type="button"
            onClick={() => props.onPrepareTaskRequestAck?.(request.requestId)}
            style={actionButtonStyle("teal")}
          >
            {GPT_TASK_TEXT.progress.setAck}
          </button>
        ) : null}
      </div>
    </div>
  );
}
