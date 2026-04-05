"use client";

import React from "react";
import type { TaskDraft } from "@/types/task";

type Props = {
  taskDraft: TaskDraft;
  onChangeTitle: (value: string) => void;
  onChangeUserInstruction: (value: string) => void;
  onChangeBody: (value: string) => void;
  isMobile?: boolean;
  compact?: boolean;
};

const cardStyle = (isMobile: boolean): React.CSSProperties => ({
  border: "1px solid #dbe4ee",
  background: "#ffffff",
  borderRadius: 14,
  padding: isMobile ? 10 : 12,
  boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
  display: "grid",
  gap: 10,
});

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
  marginBottom: 4,
};

const inputStyle = (isMobile: boolean): React.CSSProperties => ({
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: isMobile ? "8px 10px" : "9px 12px",
  fontSize: isMobile ? 13 : 14,
  lineHeight: 1.5,
  outline: "none",
  color: "#0f172a",
  background: "#fff",
});

const textareaStyle = (isMobile: boolean, minRows: number): React.CSSProperties => ({
  ...inputStyle(isMobile),
  resize: "vertical",
  minHeight: `${minRows * 1.65}em`,
  fontFamily: "inherit",
  whiteSpace: "pre-wrap",
});

export default function GptTaskEditor({
  taskDraft,
  onChangeTitle,
  onChangeUserInstruction,
  onChangeBody,
  isMobile = false,
  compact = false,
}: Props) {
  return (
    <div style={cardStyle(isMobile)}>
      <div>
        <div style={labelStyle}>タイトル</div>
        <input
          value={taskDraft.title}
          onChange={(event) => onChangeTitle(event.target.value)}
          placeholder="タスクの主題"
          style={inputStyle(isMobile)}
        />
      </div>

      <div>
        <div style={labelStyle}>タスク追加指示</div>
        <textarea
          value={taskDraft.userInstruction}
          onChange={(event) => onChangeUserInstruction(event.target.value)}
          placeholder="例: 日本人旅行者向けに簡潔に / 500文字以内 / 箇条書き"
          rows={compact ? 2 : 3}
          style={textareaStyle(isMobile, compact ? 2 : 3)}
        />
      </div>

      {!compact && (
        <div>
          <div style={labelStyle}>AI整理本文</div>
          <textarea
            value={taskDraft.body}
            onChange={(event) => onChangeBody(event.target.value)}
            placeholder="AIが整理した本文。手動で微修正もできます。"
            rows={8}
            style={textareaStyle(isMobile, 8)}
          />
        </div>
      )}
    </div>
  );
}
