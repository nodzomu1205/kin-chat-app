import React, { useMemo, useState } from "react";
import type { TaskDraft } from "@/types/task";
import {
  tokenCardStyle,
  tokenLeftLabelStyle,
  tokenMetaStyle,
} from "./gptPanelStyles";

const statusLabelMap = {
  idle: "未作成",
  prepared: "整理済",
  deepened: "深堀り済",
  formatted: "Kin送信準備済",
} as const;

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
  onChangeTaskTitle: (value: string) => void;
  onChangeTaskUserInstruction: (value: string) => void;
  onChangeTaskBody: (value: string) => void;
  isMobile?: boolean;
};

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

export default function GptTaskStatusDrawer({
  taskDraft,
  onChangeTaskTitle,
  onChangeTaskUserInstruction,
  onChangeTaskBody,
  isMobile = false,
}: Props) {
  const [editPolicyOpen, setEditPolicyOpen] = useState(false);
  const [editBodyOpen, setEditBodyOpen] = useState(false);

  const latestSource =
    taskDraft.sources.length > 0
      ? taskDraft.sources[taskDraft.sources.length - 1]
      : null;

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
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }, [taskDraft.userInstruction]);

  const bodyPreview = useMemo(() => {
    const text =
      taskDraft.body?.trim() ||
      taskDraft.mergedText?.trim() ||
      taskDraft.deepenText?.trim() ||
      taskDraft.prepText?.trim() ||
      "";
    if (!text) return "まだ本文はありません。";
    return text.length > 220 ? `${text.slice(0, 220)}…` : text;
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
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div style={tokenLeftLabelStyle}>現在タスク</div>
          <div style={tokenMetaStyle}>active: 1件</div>
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
          {taskName}
        </div>

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

          <div style={{ fontWeight: 800, color: "#334155" }}>タスク名</div>
          <div>{taskName}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>追加指示</div>
          <div>{instructionPreview}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>検索素材</div>
          <div>{taskDraft.searchContext?.query || "-"}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>ソース数</div>
          <div>{taskDraft.sources.length}件</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>最新反映</div>
          <div>{latestLabel}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>反映種別</div>
          <div>{latestType}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>更新時刻</div>
          <div>{formatUpdatedAt(taskDraft.updatedAt)}</div>

          <div style={{ fontWeight: 800, color: "#334155" }}>Kin送信</div>
          <div>{taskDraft.kinTaskText.trim() ? "準備完了" : "未準備"}</div>
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
            タイトルと追加指示はここで管理します。普段は閉じておいて、必要な時だけ編集できます。
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
                onChange={(e) => onChangeTaskTitle(e.target.value)}
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
                追加指示
              </div>
              <textarea
                value={taskDraft.userInstruction || ""}
                onChange={(e) => onChangeTaskUserInstruction(e.target.value)}
                placeholder="例: 日本人旅行者向けに簡潔に / Sandton周辺中心で"
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
                追加指示クリア
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
          <div style={tokenLeftLabelStyle}>AI整理本文</div>
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

        {editBodyOpen && (
          <textarea
            value={taskDraft.body || ""}
            onChange={(e) => onChangeTaskBody(e.target.value)}
            placeholder="AI整理本文"
            rows={isMobile ? 10 : 12}
            style={textareaStyle}
          />
        )}
      </div>

      <div style={tokenCardStyle}>
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>補足</div>
        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          {hasTask
            ? "編集UIはタスク状態に集約し、タスク① / タスク②は操作専用に寄せています。検索素材は保持され、検索統合で再利用できます。"
            : "まだタスクは作成されていません。新規ボタンまたはファイル注入後処理から開始できます。"}
        </div>
      </div>
    </div>
  );
}