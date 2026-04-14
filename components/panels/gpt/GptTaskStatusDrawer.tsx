"use client";

import React, { useMemo, useState } from "react";
import type { TaskDraft } from "@/types/task";
import {
  tokenCardStyle,
  tokenLeftLabelStyle,
  tokenMetaStyle,
} from "./gptPanelStyles";

const statusLabelMap = {
  idle: "未作成",
  prepared: "形成済み",
  deepened: "深掘り済み",
  formatted: "Kin送信用",
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
  const taskName = taskDraft.title || taskDraft.taskName || "未設定";
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
    if (!text) return "まだ本文はありません。";
    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
  }, [
    taskDraft.body,
    taskDraft.mergedText,
    taskDraft.deepenText,
    taskDraft.prepText,
  ]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
      }}
    >
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
            <div style={tokenLeftLabelStyle}>タスク切替</div>
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
                cursor:
                  activeTaskDraftIndex > 0 ? "pointer" : "not-allowed",
              }}
            >
              ←
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
              →
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          右矢印で次のタスクへ移動します。末尾で押すと新しい空タスクを追加します。
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
          <div style={tokenLeftLabelStyle}>現在のタスク</div>
          <div
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
          >
            <div style={tokenMetaStyle}>保持中: {taskDraftCount}件</div>
            {onSaveTaskSnapshot ? (
              <button
                type="button"
                onClick={() => {
                  onSaveTaskSnapshot();
                  setSaveNotice("ライブラリに保存しました");
                }}
                style={buttonStyle}
              >
                保存
              </button>
            ) : null}
            {onResetTaskContext ? (
              <button type="button" onClick={onResetTaskContext} style={buttonStyle}>
                Clear
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
          <div style={{ fontWeight: 800, color: "#334155" }}>状態</div>
          <div>{statusLabelMap[taskDraft.status]}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>TASK_ID</div>
          <div>{taskIdLabel}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>タスク名</div>
          <div>{taskName}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>指示</div>
          <div>{instructionPreview}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>検索語</div>
          <div>{taskDraft.searchContext?.query || "-"}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>ソース数</div>
          <div>{taskDraft.sources.length}件</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>最新ソース</div>
          <div>{latestLabel}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>種類</div>
          <div>{latestType}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>更新日時</div>
          <div suppressHydrationWarning>{formatUpdatedAt(taskDraft.updatedAt)}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>Kin転送</div>
          <div>{taskDraft.kinTaskText.trim() ? "転送準備あり" : "未作成"}</div>
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
          <div style={tokenLeftLabelStyle}>方針編集</div>
          <button
            type="button"
            onClick={() => setEditPolicyOpen((prev) => !prev)}
            style={buttonStyle}
          >
            {editPolicyOpen ? "閉じる" : "編集"}
          </button>
        </div>

        {!editPolicyOpen ? (
          <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
            タイトルと指示はここで編集できます。必要な時だけ開ける形にしています。
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                タイトル
              </div>
              <input
                value={taskDraft.title || ""}
                onChange={(event) => onChangeTaskTitle(event.target.value)}
                placeholder="タスクのタイトル"
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
                指示
              </div>
              <textarea
                value={taskDraft.userInstruction || ""}
                onChange={(event) => onChangeTaskUserInstruction(event.target.value)}
                placeholder="例: 日本市場向けに / 400字前後で"
                rows={isMobile ? 4 : 3}
                style={textareaStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => onChangeTaskUserInstruction("")}
                style={buttonStyle}
              >
                指示をクリア
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
          <div style={tokenLeftLabelStyle}>AI形成本文</div>
          <button
            type="button"
            onClick={() => setEditBodyOpen((prev) => !prev)}
            style={buttonStyle}
          >
            {editBodyOpen ? "閉じる" : "本文を編集"}
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
            placeholder="AI形成本文"
            rows={isMobile ? 10 : 12}
            style={textareaStyle}
          />
        ) : null}
      </div>

      <div style={tokenCardStyle}>
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>説明</div>
        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          {hasTask
            ? "編集内容はこのタスク表示にだけ反映されます。保存すると、タスク感を弱めた情報ドキュメントとしてライブラリに登録されます。"
            : "まだタスクは形成されていません。上の入力や各アクションから形成を始められます。"}
        </div>
      </div>
    </div>
  );
}
