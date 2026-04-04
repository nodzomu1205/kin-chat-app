import React from "react";
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
};

export default function GptTaskStatusDrawer({ taskDraft }: Props) {
  const latestSource =
    taskDraft.sources.length > 0
      ? taskDraft.sources[taskDraft.sources.length - 1]
      : null;

  const taskName = taskDraft.taskName || taskDraft.title || "未設定";
  const latestLabel = latestSource?.label || "-";
  const latestType = latestSource?.type || "-";
  const hasTask =
    !!taskDraft.prepText.trim() ||
    !!taskDraft.deepenText.trim() ||
    !!taskDraft.mergedText.trim() ||
    taskDraft.sources.length > 0;

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
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>補足</div>
        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          {hasTask
            ? "現状は単独タスク運用ですが、表示は“アクティブな1件”として扱う構造にしてあるため、将来の複数タスク化へ拡張しやすい状態です。"
            : "まだタスクは作成されていません。新規ボタンまたはファイル注入後処理から開始できます。"}
        </div>
      </div>
    </div>
  );
}
