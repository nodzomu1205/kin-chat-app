"use client";

import React, { useMemo, useState } from "react";
import type {
  GptPanelTaskProps,
} from "@/components/panels/gpt/gptPanelTypes";
import { sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";
import { buildTaskProgressOutput } from "@/components/panels/gpt/TaskProgressPanelHelpers";
import {
  actionButtonStyle,
  RequirementProgressCard,
  statusBadgeStyle,
  TaskProgressSuspendSection,
  TaskProgressSyncSection,
  UserFacingRequestCard,
} from "@/components/panels/gpt/TaskProgressPanelParts";
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
                  <RequirementProgressCard
                    key={item.id}
                    item={item}
                    isEditing={isEditing}
                    editingCompletedCount={editingCompletedCount}
                    editingTargetCount={editingTargetCount}
                    canEdit={!!onUpdateTaskProgressCounts}
                    onBeginEdit={beginEdit}
                    onChangeCompletedCount={setEditingCompletedCount}
                    onChangeTargetCount={setEditingTargetCount}
                    onCommitEdit={commitEdit}
                    onCancelEdit={() => setEditingRequirementId("")}
                  />
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
              <UserFacingRequestCard
                key={req.requestId}
                request={req}
                onAnswerTaskRequest={onAnswerTaskRequest}
                onPrepareTaskRequestAck={onPrepareTaskRequestAck}
              />
            ))
          )}
        </div>
      </section>

      {onPrepareTaskSync ? (
        <TaskProgressSyncSection
          hasActiveTask={hasActiveTask}
          syncNote={syncNote}
          onChangeSyncNote={setSyncNote}
          onBuildSyncNote={() => setSyncNote(buildTaskProgressOutput(taskProgressView))}
          onClearSyncNote={() => setSyncNote("")}
          onPrepareTaskSync={onPrepareTaskSync}
        />
      ) : null}

      {onPrepareTaskSuspend ? (
        <TaskProgressSuspendSection
          hasActiveTask={hasActiveTask}
          suspendNote={suspendNote}
          onChangeSuspendNote={setSuspendNote}
          onPrepareTaskSuspend={onPrepareTaskSuspend}
        />
      ) : null}
    </div>
  );
}
