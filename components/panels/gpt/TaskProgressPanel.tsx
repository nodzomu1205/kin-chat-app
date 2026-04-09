"use client";

import React, { useState } from "react";
import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";
import { countText, sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";

type Props = Pick<
  GptPanelProps,
  "taskProgressView" | "onAnswerTaskRequest" | "onPrepareTaskRequestAck" | "onPrepareTaskSync"
>;

export default function TaskProgressPanel({
  taskProgressView,
  onAnswerTaskRequest,
  onPrepareTaskRequestAck,
  onPrepareTaskSync,
}: Props) {
  const [syncNote, setSyncNote] = useState("");

  if (!taskProgressView) {
    return (
      <div
        style={{
          ...sectionCardStyle,
          fontSize: 13,
          color: "#64748b",
          padding: 16,
        }}
      >
        まだ進行中のKinタスクはありません。
      </div>
    );
  }

  const requiredItems = taskProgressView.requirementProgress.filter(
    (x) => x.category === "required"
  );
  const optionalItems = taskProgressView.requirementProgress.filter(
    (x) => x.category === "optional"
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionCardStyle}>
        <div style={{ fontSize: 12, color: "#64748b" }}>現在タスク</div>
        <div style={{ marginTop: 4, fontWeight: 700, color: "#0f172a" }}>
          {taskProgressView.taskId ? `#${taskProgressView.taskId} ` : ""}
          {taskProgressView.taskTitle || "未設定"}
        </div>
        <div
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            padding: "4px 10px",
            background: "#ecfeff",
            color: "#0f766e",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          STATUS: {taskProgressView.taskStatus}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>ゴール</div>
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.65 }}>
          {taskProgressView.goal || "-"}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>現在の要約</div>
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.65 }}>
          {taskProgressView.latestSummary || "-"}
        </div>
      </section>

      {[
        { title: "必須進捗", items: requiredItems },
        { title: "任意進捗", items: optionalItems },
      ].map((group) => (
        <section key={group.title} style={sectionCardStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{group.title}</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {group.items.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>なし</div>
            ) : (
              group.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    border: "1px solid #eef2f7",
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: "#fff",
                  }}
                >
                  <div style={{ color: "#334155", lineHeight: 1.55 }}>{item.label}</div>
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
                </div>
              ))
            )}
          </div>
        </section>
      ))}

      <section style={sectionCardStyle}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>ユーザーへの依頼</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {taskProgressView.userFacingRequests.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>現在はありません。</div>
          ) : (
            taskProgressView.userFacingRequests.map((req) => (
              <div
                key={req.requestId}
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
                    [{req.requestId}] {req.kind === "question" ? "質問" : "資料依頼"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{req.status}</div>
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6 }}>
                  {req.body}
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
                  <span>{req.required ? "必須" : "任意"}</span>
                  <span>ACTION: {req.actionId}</span>
                  {onAnswerTaskRequest ? (
                    <button
                      type="button"
                      onClick={() => onAnswerTaskRequest(req.requestId)}
                      style={{
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        borderRadius: 8,
                        padding: "5px 8px",
                        cursor: "pointer",
                        color: "#334155",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      この依頼に回答
                    </button>
                  ) : null}
                  {onPrepareTaskRequestAck ? (
                    <button
                      type="button"
                      onClick={() => onPrepareTaskRequestAck(req.requestId)}
                      style={{
                        border: "1px solid #bae6fd",
                        background: "#f0f9ff",
                        borderRadius: 8,
                        padding: "5px 8px",
                        cursor: "pointer",
                        color: "#0f766e",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      待機応答を作成
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
          <div style={{ fontWeight: 700, color: "#0f172a" }}>再同期メモ</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
            状態がずれたときは補足メモ付きで現在ステータスを Kin に送れます。
          </div>
          <textarea
            value={syncNote}
            onChange={(event) => setSyncNote(event.target.value)}
            placeholder="例: ask_gpt は2/3、ACTION A001 は回答済み、ここから再開してほしい"
            style={{
              width: "100%",
              minHeight: 88,
              marginTop: 10,
              border: "1px solid #dbe4e8",
              borderRadius: 12,
              padding: 10,
              resize: "vertical",
              fontSize: 13,
              color: "#334155",
              background: "#fff",
            }}
          />
          <button
            type="button"
            onClick={() => onPrepareTaskSync(syncNote)}
            style={{
              marginTop: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              borderRadius: 8,
              padding: "7px 10px",
              cursor: "pointer",
              color: "#334155",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Kinに再同期メッセージをセット
          </button>
        </section>
      ) : null}
    </div>
  );
}
