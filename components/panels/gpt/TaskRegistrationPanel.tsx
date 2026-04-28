"use client";

import React, { useState } from "react";
import type { GptPanelTaskProps } from "@/components/panels/gpt/gptPanelTypes";
import { sectionCardStyle, formatUpdatedAt } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_TASK_TEXT } from "@/components/panels/gpt/gptUiText";
import {
  normalizeTaskRegistrationLibraryCountInput,
  type RegisteredTask,
} from "@/lib/app/task-registration/taskRegistration";

type Props = Pick<
  GptPanelTaskProps,
  | "currentTaskDraft"
  | "taskRegistrationDraft"
  | "registeredTasks"
  | "editingRegisteredTaskId"
  | "taskRegistrationLibrarySettings"
  | "taskRegistrationRecurrence"
  | "onRegisterCurrentTaskDraft"
  | "onSaveCurrentTaskDraftToRegisteredTask"
  | "onEditRegisteredTask"
  | "onDeleteRegisteredTask"
  | "onCancelTaskRegistrationEdit"
  | "onStartRegisteredTask"
  | "onChangeTaskRegistrationLibrarySettings"
  | "onChangeTaskRegistrationRecurrence"
>;

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 12,
  fontWeight: 800,
  padding: "7px 10px",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  border: "1px solid #14b8a6",
  background: "#ecfeff",
  color: "#0f766e",
};

function LibraryCountInput(props: {
  count: number;
  ariaLabel: string;
  onChange?: (count: number) => void;
}) {
  const [text, setText] = useState(String(props.count));

  const handleChange = (rawValue: string) => {
    const normalized = normalizeTaskRegistrationLibraryCountInput(rawValue);
    setText(normalized.displayValue);
    if (normalized.count !== null) {
      props.onChange?.(normalized.count);
    }
  };

  const handleBlur = () => {
    if (text) return;
    props.onChange?.(0);
    setText("0");
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      style={{ ...buttonStyle, width: 92, fontWeight: 700 }}
      aria-label={props.ariaLabel}
    />
  );
}

function formatRecurrenceSummary(task: RegisteredTask) {
  if (task.recurrence.mode === "single") {
    return "単発";
  }
  const weekdays =
    task.recurrence.weekdays.length > 0
      ? task.recurrence.weekdays.join("・")
      : "曜日未設定";
  const times =
    task.recurrence.times.length > 0
      ? task.recurrence.times.join(", ")
      : "時刻未設定";
  return `反復: ${weekdays} ${times}`;
}

function RegisteredTaskRow(props: {
  task: RegisteredTask;
  onStart?: (task: RegisteredTask) => void;
  onEdit?: (task: RegisteredTask) => void;
  onDelete?: (taskId: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 10,
        background: "#ffffff",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#0f172a",
            overflowWrap: "anywhere",
          }}
        >
          {props.task.originalInstruction}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
          {formatUpdatedAt(props.task.registeredAt)}
          <span style={{ margin: "0 6px" }}>·</span>
          {formatRecurrenceSummary(props.task)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button type="button" style={primaryButtonStyle} onClick={() => props.onStart?.(props.task)}>
          {GPT_TASK_TEXT.registration.start}
        </button>
        <button type="button" style={buttonStyle} onClick={() => props.onEdit?.(props.task)}>
          {GPT_TASK_TEXT.registration.edit}
        </button>
        <button type="button" style={buttonStyle} onClick={() => props.onDelete?.(props.task.id)}>
          {GPT_TASK_TEXT.registration.delete}
        </button>
      </div>
    </div>
  );
}

export default function TaskRegistrationPanel({
  currentTaskDraft,
  taskRegistrationDraft,
  registeredTasks,
  editingRegisteredTaskId,
  taskRegistrationLibrarySettings,
  taskRegistrationRecurrence,
  onRegisterCurrentTaskDraft,
  onSaveCurrentTaskDraftToRegisteredTask,
  onEditRegisteredTask,
  onDeleteRegisteredTask,
  onCancelTaskRegistrationEdit,
  onStartRegisteredTask,
  onChangeTaskRegistrationLibrarySettings,
  onChangeTaskRegistrationRecurrence,
}: Props) {
  void currentTaskDraft;
  const draftText = taskRegistrationDraft.kinTaskText || taskRegistrationDraft.body;
  const canRegister = Boolean(draftText.trim()) && !!onRegisterCurrentTaskDraft;
  const canOverwrite =
    Boolean(draftText.trim()) &&
    Boolean(editingRegisteredTaskId) &&
    !!onSaveCurrentTaskDraftToRegisteredTask;
  const recurrence = taskRegistrationRecurrence;
  const [hiddenDraftText, setHiddenDraftText] = useState("");
  const showDraftEditor =
    Boolean(draftText.trim()) && hiddenDraftText !== draftText;
  const showRegistrationEditor = showDraftEditor;

  const toggleWeekday = (weekday: string) => {
    const weekdays = recurrence.weekdays.includes(weekday)
      ? recurrence.weekdays.filter((item) => item !== weekday)
      : [...recurrence.weekdays, weekday];
    onChangeTaskRegistrationRecurrence?.({ weekdays });
  };

  const handleRegister = () => {
    onRegisterCurrentTaskDraft?.();
    setHiddenDraftText(draftText);
  };

  const handleOverwrite = () => {
    if (!editingRegisteredTaskId) return;
    onSaveCurrentTaskDraftToRegisteredTask?.(editingRegisteredTaskId);
    setHiddenDraftText(draftText);
  };

  const handleCancel = () => {
    onCancelTaskRegistrationEdit?.();
    setHiddenDraftText(draftText);
  };

  const handleEdit = (task: RegisteredTask) => {
    onEditRegisteredTask?.(task);
    setHiddenDraftText("");
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ ...sectionCardStyle, borderRadius: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
          {GPT_TASK_TEXT.registration.listTitle}
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {registeredTasks.length > 0 ? (
            registeredTasks.map((task) => (
              <RegisteredTaskRow
                key={task.id}
                task={task}
                onStart={onStartRegisteredTask}
                onEdit={handleEdit}
                onDelete={onDeleteRegisteredTask}
              />
            ))
          ) : (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {GPT_TASK_TEXT.registration.emptyList}
            </div>
          )}
        </div>
      </section>

      {showRegistrationEditor ? (
        <section style={{ ...sectionCardStyle, borderRadius: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
            {GPT_TASK_TEXT.registration.draftTitle}
          </div>
          <textarea
            value={draftText}
            readOnly
            style={{
              marginTop: 10,
              width: "100%",
              minHeight: 220,
              boxSizing: "border-box",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: 10,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#0f172a",
              background: "#f8fafc",
              resize: "vertical",
            }}
          />
        </section>
      ) : null}

      {showRegistrationEditor ? (
        <section style={{ ...sectionCardStyle, borderRadius: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
            {GPT_TASK_TEXT.registration.libraryTitle}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={
                taskRegistrationLibrarySettings.enabled
                  ? primaryButtonStyle
                  : buttonStyle
              }
              onClick={() =>
                onChangeTaskRegistrationLibrarySettings?.({ enabled: true })
              }
            >
              {GPT_TASK_TEXT.registration.libraryOn}
            </button>
            <button
              type="button"
              style={
                !taskRegistrationLibrarySettings.enabled
                  ? primaryButtonStyle
                  : buttonStyle
              }
              onClick={() =>
                onChangeTaskRegistrationLibrarySettings?.({ enabled: false })
              }
            >
              {GPT_TASK_TEXT.registration.libraryOff}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <select
              value={taskRegistrationLibrarySettings.mode}
              onChange={(event) =>
                onChangeTaskRegistrationLibrarySettings?.({
                  mode: event.target.value as Props["taskRegistrationLibrarySettings"]["mode"],
                })
              }
              style={{ ...buttonStyle, fontWeight: 700 }}
            >
              <option value="summary_only">summary only</option>
              <option value="summary_with_excerpt">summary + excerpt</option>
            </select>
            <LibraryCountInput
              key={taskRegistrationLibrarySettings.count}
              count={taskRegistrationLibrarySettings.count}
              ariaLabel={GPT_TASK_TEXT.registration.libraryCount}
              onChange={(count) =>
                onChangeTaskRegistrationLibrarySettings?.({ count })
              }
            />
          </div>
        </section>
      ) : null}

      {showRegistrationEditor ? (
        <section style={{ ...sectionCardStyle, borderRadius: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
            {GPT_TASK_TEXT.registration.recurrenceTitle}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={recurrence.mode === "single" ? primaryButtonStyle : buttonStyle}
              onClick={() => onChangeTaskRegistrationRecurrence?.({ mode: "single" })}
            >
              {GPT_TASK_TEXT.registration.single}
            </button>
            <button
              type="button"
              style={recurrence.mode === "repeat" ? primaryButtonStyle : buttonStyle}
              onClick={() => onChangeTaskRegistrationRecurrence?.({ mode: "repeat" })}
            >
              {GPT_TASK_TEXT.registration.repeat}
            </button>
          </div>
          {recurrence.mode === "repeat" ? (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() =>
                    onChangeTaskRegistrationRecurrence?.({
                      weekdays: [...GPT_TASK_TEXT.registration.weekdays],
                    })
                  }
                >
                  {GPT_TASK_TEXT.registration.everyday}
                </button>
                {GPT_TASK_TEXT.registration.weekdays.map((weekday) => (
                  <label
                    key={weekday}
                    style={{
                      ...buttonStyle,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: recurrence.weekdays.includes(weekday)
                        ? "#ecfeff"
                        : "#ffffff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={recurrence.weekdays.includes(weekday)}
                      onChange={() => toggleWeekday(weekday)}
                    />
                    {weekday}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recurrence.times.map((time, index) => (
                  <span key={`${index}-${time}`} style={{ display: "inline-flex", gap: 4 }}>
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => {
                        const times = recurrence.times.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item
                        );
                        onChangeTaskRegistrationRecurrence?.({ times });
                      }}
                      style={buttonStyle}
                    />
                    <button
                      type="button"
                      style={buttonStyle}
                      aria-label={GPT_TASK_TEXT.registration.deleteTime}
                      onClick={() =>
                        onChangeTaskRegistrationRecurrence?.({
                          times: recurrence.times.filter(
                            (_item, itemIndex) => itemIndex !== index
                          ),
                        })
                      }
                    >
                      x
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() =>
                    onChangeTaskRegistrationRecurrence?.({
                      times: [...recurrence.times, "09:00"],
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {showRegistrationEditor ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{
              ...primaryButtonStyle,
              flex: "1 1 150px",
              opacity: canRegister ? 1 : 0.5,
              cursor: canRegister ? "pointer" : "not-allowed",
            }}
            disabled={!canRegister}
            onClick={handleRegister}
          >
            新規登録
          </button>
          <button
            type="button"
            style={{
              ...primaryButtonStyle,
              flex: "1 1 150px",
              opacity: canOverwrite ? 1 : 0.5,
              cursor: canOverwrite ? "pointer" : "not-allowed",
            }}
            disabled={!canOverwrite}
            onClick={handleOverwrite}
          >
            上書き保存
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, flex: "1 1 120px" }}
            onClick={handleCancel}
          >
            キャンセル
          </button>
        </div>
      ) : null}
    </div>
  );
}
