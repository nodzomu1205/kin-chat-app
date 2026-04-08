"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import GptComposer from "@/components/panels/gpt/GptComposer";
import GptMetaDrawer from "@/components/panels/gpt/GptMetaDrawer";
import GptSettingsDrawer from "@/components/panels/gpt/GptSettingsDrawer";
import GptTaskStatusDrawer from "@/components/panels/gpt/GptTaskStatusDrawer";
import GptToolbar from "@/components/panels/gpt/GptToolbar";
import type {
  GptInstructionMode,
  GptPanelProps,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  chatBodyStyle,
  drawerWrapStyle,
  footerStyle,
  panelShellStyle,
  pillButton,
  statusDotStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import { sumUsages } from "@/components/panels/gpt/gptPanelUtils";


type TopTabKey =
  | "memory"
  | "tokens"
  | "task_draft"
  | "task_progress"
  | "protocol"
  | "received_docs"
  | "search_raw";
type DrawerMode = TopTabKey | "settings" | null;
type BottomTabKey = "chat" | "task_primary" | "task_secondary" | "kin" | "file";
type FloatingLabel = {
  kind: string;
  value: string;
  updatedAt: string;
  accent: string;
  chipBg: string;
};

type LocalMemorySettingsInput = {
  maxFacts: string;
  maxPreferences: string;
  chatRecentLimit: string;
  summarizeThreshold: string;
  recentKeep: string;
};

function toLocalSettings(props: GptPanelProps): LocalMemorySettingsInput {
  return {
    maxFacts: String(props.memorySettings.maxFacts ?? props.defaultMemorySettings.maxFacts ?? 0),
    maxPreferences: String(
      props.memorySettings.maxPreferences ?? props.defaultMemorySettings.maxPreferences ?? 0
    ),
    chatRecentLimit: String(
      props.memorySettings.chatRecentLimit ?? props.defaultMemorySettings.chatRecentLimit ?? 0
    ),
    summarizeThreshold: String(
      props.memorySettings.summarizeThreshold ?? props.defaultMemorySettings.summarizeThreshold ?? 0
    ),
    recentKeep: String(props.memorySettings.recentKeep ?? props.defaultMemorySettings.recentKeep ?? 0),
  };
}

function toPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function formatUpdatedAt(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countText(
  completedCount?: number,
  targetCount?: number,
  status?: string
) {
  if (typeof completedCount === "number" && typeof targetCount === "number") {
    return `${completedCount}/${targetCount}`;
  }
  return status || "-";
}

function topTabStyle(active: boolean, isMobile: boolean): React.CSSProperties {
  return {
    height: isMobile ? 22 : 24,
    borderRadius: "0 0 9px 9px",
    border: "1px solid #cbd5e1",
    borderTop: active ? "none" : "1px solid #cbd5e1",
    background: active ? "#ffffff" : "#f8fafc",
    color: active ? "#0f766e" : "#475569",
    fontSize: isMobile ? 10 : 11,
    fontWeight: 800,
    padding: isMobile ? "0 7px" : "0 8px",
    boxShadow: active ? "0 4px 10px rgba(15,23,42,0.08)" : "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxSizing: "border-box",
  };
}

function DrawerTabs({
  activeDrawer,
  isMobile,
  onChange,
}: {
  activeDrawer: DrawerMode;
  isMobile: boolean;
  onChange: (next: DrawerMode) => void;
}) {
  const toggle = (key: TopTabKey) => onChange(activeDrawer === key ? null : key);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 0,
          borderTop: "1px solid rgba(255,255,255,0.36)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          transform: "translateY(calc(100% - 1px))",
          zIndex: 30,
          display: "flex",
          alignItems: "flex-start",
          gap: 3,
          maxWidth: "100%",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
      <button type="button" onClick={() => toggle("memory")} style={topTabStyle(activeDrawer === "memory", isMobile)}>
        メモリ
      </button>
      <button type="button" onClick={() => toggle("tokens")} style={topTabStyle(activeDrawer === "tokens", isMobile)}>
        トークン
      </button>
      <button type="button" onClick={() => toggle("task_draft")} style={topTabStyle(activeDrawer === "task_draft", isMobile)}>
        タスク整理
      </button>
      <button type="button" onClick={() => toggle("task_progress")} style={topTabStyle(activeDrawer === "task_progress", isMobile)}>
        タスク進捗
      </button>
      <button type="button" onClick={() => toggle("protocol")} style={topTabStyle(activeDrawer === "protocol", isMobile)}>
        Protocol
      </button>
      <button type="button" onClick={() => toggle("received_docs")} style={topTabStyle(activeDrawer === "received_docs", isMobile)}>
        受信
      </button>
      <button type="button" onClick={() => toggle("search_raw")} style={topTabStyle(activeDrawer === "search_raw", isMobile)}>
        検索raw
      </button>
      </div>
    </>
  );
}

function SearchRawDrawer({
  lastSearchContext,
  searchHistory,
}: Pick<GptPanelProps, "lastSearchContext" | "searchHistory">) {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!selectedId && lastSearchContext?.rawResultId) {
      setSelectedId(lastSearchContext.rawResultId);
      return;
    }
    if (selectedId && !searchHistory.some((item) => item.rawResultId === selectedId)) {
      setSelectedId(lastSearchContext?.rawResultId || searchHistory[0]?.rawResultId || "");
    }
  }, [lastSearchContext?.rawResultId, searchHistory, selectedId]);

  const selected =
    searchHistory.find((item) => item.rawResultId === selectedId) ||
    lastSearchContext ||
    null;

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #dbe4e8",
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    padding: 14,
  };

  if (!selected && searchHistory.length === 0) {
    return (
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, color: "#64748b" }}>保存された検索 raw 結果はまだありません。</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionStyle}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>保存済み検索履歴</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {searchHistory.map((item) => (
            <button
              key={item.rawResultId}
              type="button"
              onClick={() => setSelectedId(item.rawResultId)}
              style={{
                textAlign: "left",
                border: item.rawResultId === selected?.rawResultId ? "1px solid #99f6e4" : "1px solid #e2e8f0",
                borderRadius: 12,
                background: item.rawResultId === selected?.rawResultId ? "#ecfeff" : "#fff",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 700 }}>{item.rawResultId}</div>
              <div style={{ marginTop: 4, color: "#334155", fontWeight: 700 }}>{item.query}</div>
              <div
                suppressHydrationWarning
                style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}
              >
                {formatUpdatedAt(item.createdAt)}
              </div>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <section style={sectionStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>検索 raw 結果</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
            <div><strong>ID:</strong> {selected.rawResultId}</div>
            <div><strong>Query:</strong> {selected.query}</div>
            {selected.summaryText ? <div><strong>Summary:</strong> {selected.summaryText}</div> : null}
            <div suppressHydrationWarning>
              <strong>Created:</strong> {formatUpdatedAt(selected.createdAt) || "-"}
            </div>
          </div>
          {selected.sources?.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 12, color: "#475569" }}>
              {selected.sources.map((source, index) => (
                <div key={`${selected.rawResultId}-${index}`}>
                  {index + 1}. {source.title} {source.link ? `| ${source.link}` : ""}
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            readOnly
            value={selected.rawText || ""}
            style={{
              width: "100%",
              minHeight: 260,
              marginTop: 12,
              border: "1px solid #dbe4e8",
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#334155",
              background: "#fff",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </section>
      ) : null}
    </div>
  );
}

function ReceivedDocsDrawer({
  multipartAssemblies,
  onLoadMultipartAssemblyToGptInput,
  onDownloadMultipartAssembly,
}: Pick<
  GptPanelProps,
  "multipartAssemblies" | "onLoadMultipartAssemblyToGptInput" | "onDownloadMultipartAssembly"
>) {
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (!selectedId && multipartAssemblies[0]?.id) {
      setSelectedId(multipartAssemblies[0].id);
      return;
    }
    if (selectedId && !multipartAssemblies.some((item) => item.id === selectedId)) {
      setSelectedId(multipartAssemblies[0]?.id || "");
    }
  }, [multipartAssemblies, selectedId]);

  const selected =
    multipartAssemblies.find((item) => item.id === selectedId) || multipartAssemblies[0] || null;

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #dbe4e8",
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    padding: 14,
  };

  if (multipartAssemblies.length === 0) {
    return (
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          まだ分割受信して再統合した文書はありません。
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionStyle}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>受信文書一覧</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {multipartAssemblies.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              style={{
                textAlign: "left",
                border: item.id === selected?.id ? "1px solid #99f6e4" : "1px solid #e2e8f0",
                borderRadius: 12,
                background: item.id === selected?.id ? "#ecfeff" : "#fff",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 700 }}>{item.filename}</div>
              <div style={{ marginTop: 4, color: "#334155", fontWeight: 700 }}>
                {item.taskId ? `TASK #${item.taskId}` : "TASK IDなし"} / {item.parts.length}/{item.totalParts}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                {item.isComplete ? "complete" : "receiving"} / {formatUpdatedAt(item.updatedAt)}
              </div>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <section style={sectionStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>再統合テキスト</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
            <div><strong>File:</strong> {selected.filename}</div>
            <div><strong>Status:</strong> {selected.isComplete ? "complete" : "receiving"}</div>
            <div><strong>Parts:</strong> {selected.parts.length}/{selected.totalParts}</div>
            {selected.summary ? <div><strong>Summary:</strong> {selected.summary}</div> : null}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => onLoadMultipartAssemblyToGptInput(selected.id)}
              style={{
                ...pillButton,
                background: "#ffffff",
                color: "#0f766e",
                border: "1px solid #99f6e4",
              }}
            >
              GPT入力にセット
            </button>
            <button
              type="button"
              onClick={() => onDownloadMultipartAssembly(selected.id)}
              style={{
                ...pillButton,
                background: "#ffffff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
              }}
            >
              ダウンロード
            </button>
          </div>
          <textarea
            readOnly
            value={selected.assembledText}
            style={{
              width: "100%",
              minHeight: 260,
              marginTop: 12,
              border: "1px solid #dbe4e8",
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#334155",
              background: "#fff",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </section>
      ) : null}
    </div>
  );
}

function TaskProgressPanel({
  taskProgressView,
  onAnswerTaskRequest,
  onPrepareTaskRequestAck,
  onPrepareTaskSync,
}: Pick<
  GptPanelProps,
  "taskProgressView" | "onAnswerTaskRequest" | "onPrepareTaskRequestAck" | "onPrepareTaskSync"
>) {
  const [syncNote, setSyncNote] = useState("");

  if (!taskProgressView) {
    return (
      <div
        style={{
          border: "1px solid #dbe4e8",
          borderRadius: 18,
          background: "rgba(255,255,255,0.92)",
          padding: 16,
          fontSize: 13,
          color: "#64748b",
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

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #dbe4e8",
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    padding: 14,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionStyle}>
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

      {[{ title: "必須要件", items: requiredItems }, { title: "可能要件", items: optionalItems }].map(
        (group) => (
          <section key={group.title} style={sectionStyle}>
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
                    <div style={{ flexShrink: 0, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                      {countText(item.completedCount, item.targetCount, item.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )
      )}

      <section style={sectionStyle}>
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
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#334155" }}>
                    [{req.requestId}] {req.kind === "question" ? "確認" : "資料要求"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{req.status}</div>
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6 }}>
                  {req.body}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#64748b" }}>
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
        <section style={sectionStyle}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>再同期</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
            状態がずれたときは補足メモ付きで現在ステータスを Kin に再送できます。
          </div>
          <textarea
            value={syncNote}
            onChange={(event) => setSyncNote(event.target.value)}
            placeholder="例: ask_gpt は2/3、ACTION A001 は回答待ち、ここから再開してください。"
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
            Kinに再同期メッセージを作成
          </button>
        </section>
      ) : null}
    </div>
  );
}

function ProtocolDrawer({
  protocolPrompt,
  protocolRulebook,
  onChangeProtocolPrompt,
  onChangeProtocolRulebook,
  onResetProtocolDefaults,
  onSetProtocolRulebookToKinDraft,
  onSendProtocolRulebookToKin,
}: Pick<
  GptPanelProps,
  | "protocolPrompt"
  | "protocolRulebook"
  | "onChangeProtocolPrompt"
  | "onChangeProtocolRulebook"
  | "onResetProtocolDefaults"
  | "onSetProtocolRulebookToKinDraft"
  | "onSendProtocolRulebookToKin"
>) {
  const sectionStyle: React.CSSProperties = {
    border: "1px solid #dbe4e8",
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    padding: 14,
  };

  const textAreaStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    lineHeight: 1.6,
    color: "#0f172a",
    resize: "vertical",
    background: "#fff",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    color: "#334155",
    fontWeight: 700,
    fontSize: 12,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionStyle}>
        <div style={{ fontSize: 12, color: "#64748b" }}>常設 Prompt</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          Kindroid の prompt 欄に入れる短い固定ルールです。ここで編集して保持できます。
        </div>
        <textarea
          value={protocolPrompt}
          onChange={(event) => onChangeProtocolPrompt(event.target.value)}
          style={{ ...textAreaStyle, minHeight: 180, marginTop: 10 }}
        />
      </section>

      <section style={sectionStyle}>
        <div style={{ fontSize: 12, color: "#64748b" }}>詳細ルールブック</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          `SYS_INFO` として Kin に送る詳細運用ルールです。下書き化も即送信もできます。
        </div>
        <textarea
          value={protocolRulebook}
          onChange={(event) => onChangeProtocolRulebook(event.target.value)}
          style={{ ...textAreaStyle, minHeight: 220, marginTop: 10 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={buttonStyle} onClick={onResetProtocolDefaults}>
            既定値に戻す
          </button>
          <button type="button" style={buttonStyle} onClick={onSetProtocolRulebookToKinDraft}>
            Kin送信欄にセット
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle,
              border: "1px solid #99f6e4",
              background: "#ecfeff",
              color: "#0f766e",
            }}
            onClick={onSendProtocolRulebookToKin}
          >
            SYS_INFO として Kin に送る
          </button>
        </div>
      </section>
    </div>
  );
}

export default function GptPanel(props: GptPanelProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerMode>(null);
  const [bottomTab, setBottomTab] = useState<BottomTabKey>("chat");
  const [showMemoryContent, setShowMemoryContent] = useState(false);
  const [localSettings, setLocalSettings] = useState<LocalMemorySettingsInput>(() =>
    toLocalSettings(props)
  );

  useEffect(() => {
    setLocalSettings(toLocalSettings(props));
  }, [props.memorySettings, props.defaultMemorySettings, props.currentKin]);

  const recentCount = props.gptState.recentMessages?.length ?? 0;
  const factCount = props.gptState.memory?.facts?.length ?? 0;
  const preferenceCount = props.gptState.memory?.preferences?.length ?? 0;
  const memoryUsed = recentCount + factCount + preferenceCount;
  const memoryCapacity =
    (props.memorySettings.chatRecentLimit ?? 0) +
    (props.memorySettings.maxFacts ?? 0) +
    (props.memorySettings.maxPreferences ?? 0);

  const floatingLabel = useMemo<FloatingLabel>(() => {
    const taskName =
      props.currentTaskDraft.title?.trim() ||
      props.currentTaskDraft.taskName?.trim() ||
      props.gptState.memory?.context?.currentTask?.trim() ||
      "";
    const topic = props.gptState.memory?.context?.currentTopic?.trim() || "";
    const taskFocused =
      bottomTab === "task_primary" ||
      bottomTab === "task_secondary" ||
      activeDrawer === "task_draft" ||
      activeDrawer === "task_progress";

    if (taskFocused && taskName) {
      return {
        kind: "タスク",
        value: taskName,
        updatedAt: props.currentTaskDraft.updatedAt || "",
        accent: "#b45309",
        chipBg: "#fff7ed",
      };
    }

    if (bottomTab === "chat" && topic) {
      return {
        kind: "トピック",
        value: topic,
        updatedAt: "",
        accent: "#0f766e",
        chipBg: "#ecfeff",
      };
    }

    if (topic) {
      return {
        kind: "トピック",
        value: topic,
        updatedAt: "",
        accent: "#0f766e",
        chipBg: "#ecfeff",
      };
    }

    if (taskName) {
      return {
        kind: "タスク",
        value: taskName,
        updatedAt: props.currentTaskDraft.updatedAt || "",
        accent: "#b45309",
        chipBg: "#fff7ed",
      };
    }

    return {
      kind: "",
      value: "",
      updatedAt: "",
      accent: "#111827",
      chipBg: "transparent",
    };
  }, [
    activeDrawer,
    bottomTab,
    props.currentTaskDraft.taskName,
    props.currentTaskDraft.title,
    props.currentTaskDraft.updatedAt,
    props.gptState.memory?.context?.currentTopic,
    props.gptState.memory?.context?.currentTask,
  ]);

  const memoryCapacityPreview =
    toPositiveInt(localSettings.chatRecentLimit, props.memorySettings.chatRecentLimit ?? 0) +
    toPositiveInt(localSettings.maxFacts, props.memorySettings.maxFacts ?? 0) +
    toPositiveInt(localSettings.maxPreferences, props.memorySettings.maxPreferences ?? 0);

  const rolling5Usage = sumUsages(
    Array.isArray((props.tokenStats as { recentChatUsages?: unknown }).recentChatUsages)
      ? (((props.tokenStats as { recentChatUsages?: unknown }).recentChatUsages as Array<{
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
        }>) ?? [])
      : []
  );
  const totalUsage = {
    inputTokens: props.tokenStats.cumulativeInput ?? 0,
    outputTokens: props.tokenStats.cumulativeOutput ?? 0,
    totalTokens: props.tokenStats.cumulativeTotal ?? 0,
  };

  const renderDrawerContent = () => {
    if (activeDrawer === "memory") {
      return (
        <GptMetaDrawer
          mode="memory"
          gptState={props.gptState as never}
          tokenStats={props.tokenStats as never}
          recent5Chat={rolling5Usage}
          totalUsage={totalUsage}
          memoryUsed={memoryUsed}
          memoryCapacity={memoryCapacity}
          recentCount={recentCount}
          factCount={factCount}
          preferenceCount={preferenceCount}
          chatRecentLimit={props.memorySettings.chatRecentLimit}
          maxFacts={props.memorySettings.maxFacts}
          maxPreferences={props.memorySettings.maxPreferences}
          showMemoryContent={showMemoryContent}
          onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
          isMobile={props.isMobile}
        />
      );
    }

    if (activeDrawer === "tokens") {
      return (
        <GptMetaDrawer
          mode="tokens"
          gptState={props.gptState as never}
          tokenStats={props.tokenStats as never}
          recent5Chat={rolling5Usage}
          totalUsage={totalUsage}
          memoryUsed={memoryUsed}
          memoryCapacity={memoryCapacity}
          recentCount={recentCount}
          factCount={factCount}
          preferenceCount={preferenceCount}
          chatRecentLimit={props.memorySettings.chatRecentLimit}
          maxFacts={props.memorySettings.maxFacts}
          maxPreferences={props.memorySettings.maxPreferences}
          showMemoryContent={showMemoryContent}
          onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
          isMobile={props.isMobile}
        />
      );
    }

    if (activeDrawer === "task_draft") {
      return (
        <GptTaskStatusDrawer
          taskDraft={props.currentTaskDraft}
          onChangeTaskTitle={props.onChangeTaskTitle}
          onChangeTaskUserInstruction={props.onChangeTaskUserInstruction}
          onChangeTaskBody={props.onChangeTaskBody}
          isMobile={props.isMobile}
        />
      );
    }

    if (activeDrawer === "task_progress") {
      return (
        <TaskProgressPanel
          taskProgressView={props.taskProgressView}
          onAnswerTaskRequest={props.onAnswerTaskRequest}
          onPrepareTaskRequestAck={props.onPrepareTaskRequestAck}
          onPrepareTaskSync={props.onPrepareTaskSync}
        />
      );
    }

    if (activeDrawer === "protocol") {
      return (
        <ProtocolDrawer
          protocolPrompt={props.protocolPrompt}
          protocolRulebook={props.protocolRulebook}
          onChangeProtocolPrompt={props.onChangeProtocolPrompt}
          onChangeProtocolRulebook={props.onChangeProtocolRulebook}
          onResetProtocolDefaults={props.onResetProtocolDefaults}
          onSetProtocolRulebookToKinDraft={props.onSetProtocolRulebookToKinDraft}
          onSendProtocolRulebookToKin={props.onSendProtocolRulebookToKin}
        />
      );
    }

    if (activeDrawer === "received_docs") {
      return (
        <ReceivedDocsDrawer
          multipartAssemblies={props.multipartAssemblies}
          onLoadMultipartAssemblyToGptInput={props.onLoadMultipartAssemblyToGptInput}
          onDownloadMultipartAssembly={props.onDownloadMultipartAssembly}
        />
      );
    }

    if (activeDrawer === "search_raw") {
      return (
        <SearchRawDrawer
          lastSearchContext={props.lastSearchContext}
          searchHistory={props.searchHistory}
        />
      );
    }

    if (activeDrawer === "settings") {
      return (
        <GptSettingsDrawer
          localSettings={localSettings}
          onFieldChange={(key, value) =>
            setLocalSettings((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
          onReset={() => {
            props.onResetMemorySettings();
            setLocalSettings({
              maxFacts: String(props.defaultMemorySettings.maxFacts ?? 0),
              maxPreferences: String(props.defaultMemorySettings.maxPreferences ?? 0),
              chatRecentLimit: String(props.defaultMemorySettings.chatRecentLimit ?? 0),
              summarizeThreshold: String(props.defaultMemorySettings.summarizeThreshold ?? 0),
              recentKeep: String(props.defaultMemorySettings.recentKeep ?? 0),
            });
          }}
          onSave={() => {
            props.onSaveMemorySettings({
              maxFacts: toPositiveInt(localSettings.maxFacts, props.memorySettings.maxFacts ?? 0),
              maxPreferences: toPositiveInt(
                localSettings.maxPreferences,
                props.memorySettings.maxPreferences ?? 0
              ),
              chatRecentLimit: toPositiveInt(
                localSettings.chatRecentLimit,
                props.memorySettings.chatRecentLimit ?? 0
              ),
              summarizeThreshold: toPositiveInt(
                localSettings.summarizeThreshold,
                props.memorySettings.summarizeThreshold ?? 0
              ),
              recentKeep: toPositiveInt(localSettings.recentKeep, props.memorySettings.recentKeep ?? 0),
            });
          }}
          memoryCapacityPreview={memoryCapacityPreview}
          responseMode={props.responseMode}
          onChangeResponseMode={props.onChangeResponseMode}
          ingestMode={props.ingestMode}
          onChangeIngestMode={props.onChangeIngestMode}
          imageDetail={props.imageDetail}
          onChangeImageDetail={props.onChangeImageDetail}
          compactCharLimit={props.compactCharLimit}
          simpleImageCharLimit={props.simpleImageCharLimit}
          onChangeCompactCharLimit={props.onChangeCompactCharLimit}
          onChangeSimpleImageCharLimit={props.onChangeSimpleImageCharLimit}
          fileReadPolicy={props.fileReadPolicy}
          onChangeFileReadPolicy={props.onChangeFileReadPolicy}
          autoSearchReferenceEnabled={props.autoSearchReferenceEnabled}
          searchReferenceMode={props.searchReferenceMode}
          searchReferenceCount={props.searchReferenceCount}
          searchHistoryLimit={props.searchHistoryLimit}
          searchHistoryStorageMB={props.searchHistoryStorageMB}
          searchReferenceEstimatedTokens={props.searchReferenceEstimatedTokens}
          onChangeAutoSearchReferenceEnabled={props.onChangeAutoSearchReferenceEnabled}
          onChangeSearchReferenceMode={props.onChangeSearchReferenceMode}
          onChangeSearchReferenceCount={props.onChangeSearchReferenceCount}
          onChangeSearchHistoryLimit={props.onChangeSearchHistoryLimit}
          onClearSearchHistory={props.onClearSearchHistory}
          pendingIntentCandidates={props.pendingIntentCandidates}
          approvedIntentPhrases={props.approvedIntentPhrases}
          onUpdateIntentCandidate={props.onUpdateIntentCandidate}
          onApproveIntentCandidate={props.onApproveIntentCandidate}
          onRejectIntentCandidate={props.onRejectIntentCandidate}
          isMobile={props.isMobile}
        />
      );
    }

    return null;
  };

  const handleToolbarAction = (mode: GptInstructionMode) => {
    void props.sendToGpt(mode);
  };

  return (
    <div
      style={{
        ...panelShellStyle(props.isMobile),
        height: "100%",
        minHeight: 0,
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 20,
          background: "#10a37f",
          color: "#fff",
          padding: props.isMobile ? "9px 12px" : "10px 14px",
          flexShrink: 0,
          minHeight: 46,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: props.isMobile ? 17 : 16,
              fontWeight: 800,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ChatGPT
          </div>

          <div
            style={{
              minWidth: 0,
              flexShrink: 1,
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={props.currentKinLabel || "Kin未選択"}
          >
            {props.currentKinLabel || "Kin未選択"}
          </div>

          <span style={statusDotStyle(props.kinStatus as "idle" | "connected" | "error")} aria-label={props.kinStatus} />

          <div style={{ flex: 1 }} />

          <button
            type="button"
            style={{
              ...pillButton,
              background:
                activeDrawer === "settings"
                  ? "rgba(255,255,255,0.22)"
                  : (pillButton.background as string),
            }}
            onClick={() => setActiveDrawer((prev) => (prev === "settings" ? null : "settings"))}
          >
            設定
          </button>
        </div>

        <DrawerTabs activeDrawer={activeDrawer} isMobile={props.isMobile} onChange={setActiveDrawer} />
      </div>

      {activeDrawer ? (
        <div style={drawerWrapStyle(props.isMobile)}>
          {renderDrawerContent()}
        </div>
      ) : null}

      <div
        style={{
          ...chatBodyStyle(props.isMobile),
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            minHeight: 30,
            padding: activeDrawer ? "18px 12px 8px 12px" : "22px 12px 10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 11,
            color: "#64748b",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflow: "hidden",
            }}
            title={floatingLabel.value || undefined}
          >
            {floatingLabel.value ? (
              <>
                <span
                  style={{
                    flexShrink: 0,
                    borderRadius: 999,
                    padding: "3px 8px",
                    fontSize: props.isMobile ? 10.5 : 11,
                    fontWeight: 800,
                    color: floatingLabel.accent,
                    background: floatingLabel.chipBg,
                    border: `1px solid ${floatingLabel.accent}22`,
                    lineHeight: 1.2,
                  }}
                >
                  {floatingLabel.kind}
                </span>
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 800,
                    color: "#111827",
                    fontSize: props.isMobile ? 12.5 : 14,
                  }}
                >
                  {floatingLabel.value}
                </span>
              </>
            ) : (
              ""
            )}
          </div>
          <div
            suppressHydrationWarning
            style={{ flexShrink: 0, whiteSpace: "nowrap", color: "#374151", fontSize: props.isMobile ? 11.5 : 12.5, fontWeight: 700 }}
          >
            {formatUpdatedAt(floatingLabel.updatedAt)}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ChatMessages
            messages={props.gptMessages}
            bottomRef={props.gptBottomRef}
            loadingText={props.loading ? "ChatGPTが応答中…" : null}
          />
        </div>
      </div>

      <div style={footerStyle(props.isMobile)}>
        {props.pendingInjectionTotalParts > 0 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0f766e",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 10,
              padding: "8px 10px",
              marginBottom: 0,
            }}
          >
            📦 注入送信中 {props.pendingInjectionCurrentPart}/{props.pendingInjectionTotalParts}
          </div>
        )}

        <div style={{ position: "relative", paddingTop: props.isMobile ? 0 : 0, marginTop: 0 }}>
          <GptToolbar
            activeTab={bottomTab}
            isMobile={props.isMobile}
            onSwitchPanel={props.onSwitchPanel}
            onChangeTab={setBottomTab}
            onAction={handleToolbarAction}
            onRunTask={() => void props.runPrepTaskFromInput()}
            onRunDeepen={() => void props.runDeepenTaskFromLast()}
            onRunTaskUpdate={() => void props.runUpdateTaskFromInput()}
            onImportLastResponse={() => void props.runUpdateTaskFromLastGptMessage()}
            onAttachSearchResult={() => void props.runAttachSearchResultToTask()}
            onSendLatestResponseToKin={() => void props.sendLatestGptContentToKin()}
            onSendCurrentTaskToKin={() => void props.sendCurrentTaskContentToKin()}
            onReceiveKinResponse={() => void props.receiveLastKinResponseToGptInput()}
            onTransfer={props.sendLastGptToKinDraft}
            onReset={props.resetGptForCurrentKin}
          />
        </div>

        <GptComposer
          value={props.gptInput}
          onChange={(value) => props.setGptInput(value)}
          onSubmit={() => void props.sendToGpt("normal")}
          submitOnEnter={!props.isMobile}
          placeholder={
            bottomTab === "chat"
              ? "メッセージを入力"
              : bottomTab === "task_primary"
                ? "送信以外のボタン使用時は、新規又は更新タスク内容を入力"
                : bottomTab === "task_secondary"
                  ? "送信以外のボタン使用時は、タスク整理に関する指示や方向性を入力"
                  : bottomTab === "kin"
                    ? "送信以外のボタン使用時は、Kinへの指示内容や条件を入力"
                    : "注入ボタン使用時は、ファイル取込時の指示を入力"
          }
          onInjectFile={props.injectFileToKinDraft}
          loading={props.loading}
          ingestLoading={props.ingestLoading}
          canInjectFile={props.canInjectFile}
          uploadKind={props.uploadKind}
          ingestMode={props.ingestMode}
          imageDetail={props.imageDetail}
          postIngestAction={props.postIngestAction}
          fileReadPolicy={props.fileReadPolicy}
          compactCharLimit={props.compactCharLimit}
          simpleImageCharLimit={props.simpleImageCharLimit}
          onChangeUploadKind={props.onChangeUploadKind}
          onChangeIngestMode={props.onChangeIngestMode}
          onChangeImageDetail={props.onChangeImageDetail}
          onChangePostIngestAction={props.onChangePostIngestAction}
          showFileTools={bottomTab === "file"}
          isMobile={props.isMobile}
        />
      </div>
    </div>
  );
}
