"use client";

import React, { useMemo, useState } from "react";
import type {
  GptPanelTaskProps,
  TaskProgressView,
} from "@/components/panels/gpt/gptPanelTypes";
import { countText, sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_TASK_TEXT } from "./gptUiText";

type Props = Pick<
  GptPanelTaskProps,
  | "taskProgressView"
  | "taskProgressCount"
  | "activeTaskProgressIndex"
  | "onAnswerTaskRequest"
  | "onPrepareTaskRequestAck"
  | "onPrepareTaskSync"
  | "onPrepareTaskSuspend"
  | "onUpdateTaskProgressCounts"
  | "onClearTaskProgress"
  | "onSelectPreviousTaskProgress"
  | "onSelectNextTaskProgress"
>;

function statusBadgeStyle(status: string): React.CSSProperties {
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

function actionButtonStyle(
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

function normalizeTaskStatusForOutput(status: TaskProgressView["taskStatus"]) {
  if (status === "suspended" || status === "waiting_material" || status === "waiting_user") {
    return "READY_TO_RESUME";
  }
  if (status === "ready_to_resume") return "READY_TO_RESUME";
  if (status === "completed") return "COMPLETED";
  return "RUNNING";
}

function buildTaskProgressOutput(view: TaskProgressView) {
  const progressLines = view.requirementProgress.length
    ? view.requirementProgress.map((item) => {
        const target = typeof item.targetCount === "number" ? `/${item.targetCount}` : "";
        const category = item.category === "required" ? "required" : "optional";
        return `- ${item.label}: ${item.completedCount ?? 0}${target} (${category}, ${item.status})`;
      })
    : ["- none"];

  const requestLines = view.userFacingRequests.length
    ? view.userFacingRequests.map(
        (request) =>
          `- ${request.actionId} [${request.kind}] ${request.status}: ${request.body}`
      )
    : ["- none"];

  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${view.taskId || ""}`,
    `STATUS: ${normalizeTaskStatusForOutput(view.taskStatus)}`,
    "SUMMARY: Progress counts were reviewed in the GPT task panel. Continue from this state and complete the task.",
    "PROGRESS:",
    ...progressLines,
    "PENDING_REQUESTS:",
    ...requestLines,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}

export default function TaskProgressPanel({
  taskProgressView,
  taskProgressCount,
  activeTaskProgressIndex,
  onAnswerTaskRequest,
  onPrepareTaskRequestAck,
  onPrepareTaskSync,
  onPrepareTaskSuspend,
  onUpdateTaskProgressCounts,
  onClearTaskProgress,
  onSelectPreviousTaskProgress,
  onSelectNextTaskProgress,
}: Props) {
  const [syncNote, setSyncNote] = useState("");
  const [suspendNote, setSuspendNote] = useState("");
  const [editingRequirementId, setEditingRequirementId] = useState("");
  const [editingCompletedCount, setEditingCompletedCount] = useState("");
  const [editingTargetCount, setEditingTargetCount] = useState("");
  const hasActiveTask = !!taskProgressView?.taskId;

  const requiredItems = useMemo(
    () =>
      (taskProgressView?.requirementProgress || []).filter(
        (item) => item.category === "required"
      ),
    [taskProgressView]
  );
  const optionalItems = useMemo(
    () =>
      (taskProgressView?.requirementProgress || []).filter(
        (item) => item.category === "optional"
      ),
    [taskProgressView]
  );

  const beginEdit = (requirementId: string, completedCount?: number, targetCount?: number) => {
    setEditingRequirementId(requirementId);
    setEditingCompletedCount(String(completedCount ?? 0));
    setEditingTargetCount(typeof targetCount === "number" ? String(targetCount) : "");
  };

  const commitEdit = () => {
    if (!editingRequirementId || !onUpdateTaskProgressCounts) return;
    onUpdateTaskProgressCounts({
      requirementId: editingRequirementId,
      completedCount: Number(editingCompletedCount || 0),
      targetCount: editingTargetCount.trim() === "" ? undefined : Number(editingTargetCount),
    });
    setEditingRequirementId("");
  };

  const handleClearTaskProgress = () => {
    const taskId = taskProgressView?.taskId;
    if (!taskId || !onClearTaskProgress) return;
    setEditingRequirementId("");
    setSyncNote("");
    setSuspendNote("");
    onClearTaskProgress(taskId);
  };

  if (!taskProgressView || !taskProgressView.taskId) {
    return (
      <div style={{ ...sectionCardStyle, fontSize: 13, color: "#64748b", padding: 16 }}>
        {GPT_TASK_TEXT.progress.noActiveTask}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {GPT_TASK_TEXT.progress.switchPrefix} {activeTaskProgressIndex + 1} / {taskProgressCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleClearTaskProgress}
              disabled={!onClearTaskProgress || !taskProgressView?.taskId}
              style={{
                ...actionButtonStyle("amber"),
                opacity: onClearTaskProgress && taskProgressView?.taskId ? 1 : 0.45,
                cursor: onClearTaskProgress && taskProgressView?.taskId ? "pointer" : "not-allowed",
              }}
            >
              {GPT_TASK_TEXT.progress.clear}
            </button>
            <button
              type="button"
              onClick={onSelectPreviousTaskProgress}
              disabled={!onSelectPreviousTaskProgress || activeTaskProgressIndex <= 0}
              style={{
                ...actionButtonStyle("default"),
                opacity: activeTaskProgressIndex > 0 ? 1 : 0.45,
                cursor: activeTaskProgressIndex > 0 ? "pointer" : "not-allowed",
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={onSelectNextTaskProgress}
              disabled={!onSelectNextTaskProgress || activeTaskProgressIndex >= taskProgressCount - 1}
              style={{
                ...actionButtonStyle("default"),
                opacity: activeTaskProgressIndex < taskProgressCount - 1 ? 1 : 0.45,
                cursor: activeTaskProgressIndex < taskProgressCount - 1 ? "pointer" : "not-allowed",
              }}
            >
              →
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{GPT_TASK_TEXT.progress.currentTask}</div>
        <div style={{ marginTop: 4, fontWeight: 700, color: "#0f172a" }}>
          #{taskProgressView.taskId} {taskProgressView.taskTitle || GPT_TASK_TEXT.status.unset}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={statusBadgeStyle(taskProgressView.taskStatus)}>STATUS: {taskProgressView.taskStatus}</div>
          {taskProgressView.taskStatus === "suspended" ? (
            <div style={statusBadgeStyle("suspended")}>{GPT_TASK_TEXT.progress.hold}</div>
          ) : null}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>{GPT_TASK_TEXT.progress.goal}</div>
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.65 }}>
          {taskProgressView.goal || "-"}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>{GPT_TASK_TEXT.progress.latestSummary}</div>
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.65 }}>
          {taskProgressView.latestSummary || "-"}
        </div>
      </section>

      {[
        { title: GPT_TASK_TEXT.progress.required, items: requiredItems },
        { title: GPT_TASK_TEXT.progress.optional, items: optionalItems },
      ].map((group) => (
        <section key={group.title} style={sectionCardStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{group.title}</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {group.items.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>{GPT_TASK_TEXT.progress.noItems}</div>
            ) : (
              group.items.map((item) => {
                const isEditing = editingRequirementId === item.id;
                return (
                  <div key={item.id} style={{ display: "grid", gap: 8, border: "1px solid #eef2f7", borderRadius: 14, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ color: "#334155", lineHeight: 1.55 }}>{item.label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ flexShrink: 0, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                          {countText(item.completedCount, item.targetCount, item.status)}
                        </div>
                        {onUpdateTaskProgressCounts ? (
                          <button type="button" onClick={() => beginEdit(item.id, item.completedCount, item.targetCount)} style={actionButtonStyle("default")}>
                            {GPT_TASK_TEXT.progress.edit}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{GPT_TASK_TEXT.progress.completed}</span>
                        <input value={editingCompletedCount} onChange={(event) => setEditingCompletedCount(event.target.value)} style={editorInputStyle} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>{GPT_TASK_TEXT.progress.target}</span>
                        <input value={editingTargetCount} onChange={(event) => setEditingTargetCount(event.target.value)} style={editorInputStyle} />
                        <button type="button" onClick={commitEdit} style={actionButtonStyle("teal")}>
                          {GPT_TASK_TEXT.progress.apply}
                        </button>
                        <button type="button" onClick={() => setEditingRequirementId("")} style={actionButtonStyle("default")}>
                          {GPT_TASK_TEXT.progress.close}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      ))}

      <section style={sectionCardStyle}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>{GPT_TASK_TEXT.progress.userRequests}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {taskProgressView.userFacingRequests.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>{GPT_TASK_TEXT.progress.noRequests}</div>
          ) : (
            taskProgressView.userFacingRequests.map((req) => (
              <div key={req.requestId} style={{ border: "1px solid #eef2f7", borderRadius: 14, padding: "10px 12px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#334155" }}>
                    [{req.requestId}] {req.kind === "question" ? GPT_TASK_TEXT.progress.question : GPT_TASK_TEXT.progress.materialRequest}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{req.status}</div>
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6 }}>
                  {req.body}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
                  <span>{req.required ? GPT_TASK_TEXT.progress.requiredShort : GPT_TASK_TEXT.progress.optionalShort}</span>
                  <span>ACTION: {req.actionId}</span>
                  {onAnswerTaskRequest ? (
                    <button type="button" onClick={() => onAnswerTaskRequest(req.requestId)} style={actionButtonStyle("default")}>
                      {GPT_TASK_TEXT.progress.answerThis}
                    </button>
                  ) : null}
                  {onPrepareTaskRequestAck ? (
                    <button type="button" onClick={() => onPrepareTaskRequestAck(req.requestId)} style={actionButtonStyle("teal")}>
                      {GPT_TASK_TEXT.progress.setAck}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {onPrepareTaskSync ? (
        <section style={sectionCardStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{GPT_TASK_TEXT.progress.syncTitle}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
            {GPT_TASK_TEXT.progress.syncHelp}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" onClick={() => setSyncNote(buildTaskProgressOutput(taskProgressView))} style={actionButtonStyle("teal")}>
              {GPT_TASK_TEXT.progress.syncBuild}
            </button>
            <button type="button" onClick={() => setSyncNote("")} style={actionButtonStyle("default")}>
              {GPT_TASK_TEXT.progress.clear}
            </button>
          </div>
          <textarea
            value={syncNote}
            onChange={(event) => setSyncNote(event.target.value)}
            placeholder={GPT_TASK_TEXT.progress.syncPlaceholder}
            style={{
              width: "100%",
              minHeight: 120,
              marginTop: 10,
              border: "1px solid #dbe4e8",
              borderRadius: 12,
              padding: 10,
              resize: "vertical",
              fontSize: 13,
              color: "#334155",
              background: "#fff",
              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={() => onPrepareTaskSync(syncNote)}
            disabled={!hasActiveTask || !syncNote.trim()}
            style={{
              marginTop: 10,
              ...actionButtonStyle("default"),
              padding: "7px 10px",
              opacity: hasActiveTask && syncNote.trim() ? 1 : 0.5,
              cursor: hasActiveTask && syncNote.trim() ? "pointer" : "not-allowed",
            }}
          >
            {GPT_TASK_TEXT.progress.setKinDraft}
          </button>
          {!hasActiveTask ? <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{GPT_TASK_TEXT.progress.missingTaskId}</div> : null}
        </section>
      ) : null}

      {onPrepareTaskSuspend ? (
        <section style={sectionCardStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{GPT_TASK_TEXT.progress.suspendTitle}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
            {GPT_TASK_TEXT.progress.suspendHelp}
          </div>
          <textarea
            value={suspendNote}
            onChange={(event) => setSuspendNote(event.target.value)}
            placeholder={GPT_TASK_TEXT.progress.suspendPlaceholder}
            style={{
              width: "100%",
              minHeight: 72,
              marginTop: 10,
              border: "1px solid #fed7aa",
              borderRadius: 12,
              padding: 10,
              resize: "vertical",
              fontSize: 13,
              color: "#334155",
              background: "#fff",
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={() => onPrepareTaskSuspend(suspendNote)}
            disabled={!hasActiveTask}
            style={{
              marginTop: 10,
              ...actionButtonStyle("amber"),
              opacity: hasActiveTask ? 1 : 0.5,
              cursor: hasActiveTask ? "pointer" : "not-allowed",
            }}
          >
            {GPT_TASK_TEXT.progress.suspendSet}
          </button>
          {!hasActiveTask ? <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{GPT_TASK_TEXT.progress.missingTaskId}</div> : null}
        </section>
      ) : null}
    </div>
  );
}
