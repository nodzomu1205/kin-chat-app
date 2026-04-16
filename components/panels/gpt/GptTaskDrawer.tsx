"use client";

import React, { useState } from "react";
import GptTaskStatusDrawer from "@/components/panels/gpt/GptTaskStatusDrawer";
import TaskProgressPanel from "@/components/panels/gpt/TaskProgressPanel";
import type { GptPanelTaskProps } from "@/components/panels/gpt/gptPanelTypes";
import { sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";

type TaskView = "draft" | "progress";

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: active ? "1px solid #14b8a6" : "1px solid #cbd5e1",
    background: active ? "#ecfeff" : "#ffffff",
    color: active ? "#0f766e" : "#475569",
    fontSize: 12,
    fontWeight: 800,
    padding: "7px 12px",
    cursor: "pointer",
  };
}

export default function GptTaskDrawer({
  currentTaskDraft,
  taskDraftCount,
  activeTaskDraftIndex,
  taskProgressView,
  taskProgressCount,
  activeTaskProgressIndex,
  onChangeTaskTitle,
  onChangeTaskUserInstruction,
  onChangeTaskBody,
  onSaveTaskSnapshot,
  onSelectPreviousTaskDraft,
  onSelectNextTaskDraft,
  onResetTaskContext,
  onAnswerTaskRequest,
  onPrepareTaskRequestAck,
  onPrepareTaskSync,
  onPrepareTaskSuspend,
  onUpdateTaskProgressCounts,
  onClearTaskProgress,
  onSelectPreviousTaskProgress,
  onSelectNextTaskProgress,
  isMobile = false,
}: Pick<
  GptPanelTaskProps,
  | "currentTaskDraft"
  | "taskDraftCount"
  | "activeTaskDraftIndex"
  | "taskProgressView"
  | "taskProgressCount"
  | "activeTaskProgressIndex"
  | "onChangeTaskTitle"
  | "onChangeTaskUserInstruction"
  | "onChangeTaskBody"
  | "onSaveTaskSnapshot"
  | "onSelectPreviousTaskDraft"
  | "onSelectNextTaskDraft"
  | "onResetTaskContext"
  | "onAnswerTaskRequest"
  | "onPrepareTaskRequestAck"
  | "onPrepareTaskSync"
  | "onPrepareTaskSuspend"
  | "onUpdateTaskProgressCounts"
  | "onClearTaskProgress"
  | "onSelectPreviousTaskProgress"
  | "onSelectNextTaskProgress"
> & {
  isMobile?: boolean;
}) {
  const [activeView, setActiveView] = useState<TaskView>("draft");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ ...sectionCardStyle, padding: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              タスク
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
              タスク形成とタスク進捗をここで切り替えます。
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveView("draft")}
              style={toggleStyle(activeView === "draft")}
            >
              タスク形成
            </button>
            <button
              type="button"
              onClick={() => setActiveView("progress")}
              style={toggleStyle(activeView === "progress")}
            >
              タスク進捗
            </button>
          </div>
        </div>
      </section>

      {activeView === "draft" ? (
        <GptTaskStatusDrawer
          taskDraft={currentTaskDraft}
          taskDraftCount={taskDraftCount}
          activeTaskDraftIndex={activeTaskDraftIndex}
          onChangeTaskTitle={onChangeTaskTitle}
          onChangeTaskUserInstruction={onChangeTaskUserInstruction}
          onChangeTaskBody={onChangeTaskBody}
          onSaveTaskSnapshot={onSaveTaskSnapshot}
          onSelectPreviousTaskDraft={onSelectPreviousTaskDraft}
          onSelectNextTaskDraft={onSelectNextTaskDraft}
          onResetTaskContext={onResetTaskContext}
          isMobile={isMobile}
        />
      ) : (
        <TaskProgressPanel
          taskProgressView={taskProgressView}
          taskProgressCount={taskProgressCount}
          activeTaskProgressIndex={activeTaskProgressIndex}
          onAnswerTaskRequest={onAnswerTaskRequest}
          onPrepareTaskRequestAck={onPrepareTaskRequestAck}
          onPrepareTaskSync={onPrepareTaskSync}
          onPrepareTaskSuspend={onPrepareTaskSuspend}
          onUpdateTaskProgressCounts={onUpdateTaskProgressCounts}
          onClearTaskProgress={onClearTaskProgress}
          onSelectPreviousTaskProgress={onSelectPreviousTaskProgress}
          onSelectNextTaskProgress={onSelectNextTaskProgress}
        />
      )}
    </div>
  );
}
