"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import ChatTextarea from "@/components/ChatTextarea";
import type { KinMemoryState, Message } from "@/types/chat";
import type { MemorySettings } from "@/lib/memory";
import type { TokenUsage } from "@/hooks/useGptMemory";

type GptInstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

type TokenStats = {
  lastChatUsage: TokenUsage | null;
  recentChatUsages: TokenUsage[];
  threadChatTotal: TokenUsage;
  lastSummaryUsage: TokenUsage | null;
  threadSummaryTotal: TokenUsage;
};

type Props = {
  currentKin: string | null;
  currentKinLabel: string | null;
  kinStatus: "idle" | "connected" | "error";
  gptState: KinMemoryState;
  gptMessages: Message[];
  gptInput: string;
  setGptInput: (value: string) => void;
  sendToGpt: (mode?: GptInstructionMode) => void;
  resetGptForCurrentKin: () => void;
  sendLastGptToKinDraft: () => void;
  loading: boolean;
  gptBottomRef: React.RefObject<HTMLDivElement | null>;
  memorySettings: MemorySettings;
  defaultMemorySettings: MemorySettings;
  onSaveMemorySettings: (next: MemorySettings) => void;
  onResetMemorySettings: () => void;
  tokenStats: TokenStats;
  onSwitchPanel?: () => void;
  isMobile?: boolean;
};

const buttonPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
};

const buttonReset: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonTransfer: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d8b4fe",
  background: "#faf5ff",
  color: "#7e22ce",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonTranslate: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonReply: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#15803d",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonPolish: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#b45309",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonMemory: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #a7f3d0",
  background: "#ecfdf5",
  color: "#047857",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const buttonSwitch: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cfd8dc",
  boxSizing: "border-box",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 4,
};

const helpTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  lineHeight: 1.4,
};

const statusBadgeStyle = (
  status: "idle" | "connected" | "error"
): React.CSSProperties => {
  const map = {
    idle: { background: "#f3f4f6", color: "#4b5563", border: "1px solid #e5e7eb" },
    connected: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
    error: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  } as const;

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    ...map[status],
  };
};

const pillLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

const compactValueStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#111827",
  fontWeight: 700,
  lineHeight: 1.2,
};

const longValueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#111827",
  fontWeight: 700,
  lineHeight: 1.25,
};

const tokenCardStyle: React.CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 8,
  background: "rgba(255,255,255,0.9)",
  padding: "8px 10px",
  minWidth: 0,
};

const tokenRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr)",
  gap: 8,
  alignItems: "start",
};

const tokenLeftLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tokenLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  lineHeight: 1.5,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tokenMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 500,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function sumUsages(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (acc, usage) => ({
      inputTokens: acc.inputTokens + usage.inputTokens,
      outputTokens: acc.outputTokens + usage.outputTokens,
      totalTokens: acc.totalTokens + usage.totalTokens,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
  );
}

function mergeUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

function normalizeLocalSettings(input: MemorySettings): MemorySettings {
  const chatRecentLimit = Math.max(2, Math.floor(input.chatRecentLimit || 0));
  const recentKeep = Math.max(
    1,
    Math.min(Math.floor(input.recentKeep || 0), chatRecentLimit)
  );
  const summarizeThreshold = Math.max(
    2,
    Math.floor(input.summarizeThreshold || 0),
    recentKeep
  );

  return {
    maxFacts: Math.max(1, Math.floor(input.maxFacts || 0)),
    maxPreferences: Math.max(1, Math.floor(input.maxPreferences || 0)),
    chatRecentLimit,
    summarizeThreshold,
    recentKeep,
  };
}

function UsageInline({ usage }: { usage: TokenUsage }) {
  return (
    <>
      {formatNumber(usage.totalTokens)}{" "}
      <span style={tokenMetaStyle}>
        (in {formatNumber(usage.inputTokens)} / out {formatNumber(usage.outputTokens)})
      </span>
    </>
  );
}

export default function GptPanel(props: Props) {
  const {
    currentKin,
    currentKinLabel,
    kinStatus,
    gptState,
    gptMessages,
    gptInput,
    setGptInput,
    sendToGpt,
    resetGptForCurrentKin,
    sendLastGptToKinDraft,
    loading,
    gptBottomRef,
    memorySettings,
    defaultMemorySettings,
    onSaveMemorySettings,
    onResetMemorySettings,
    tokenStats,
    onSwitchPanel,
    isMobile = false,
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const [showMeta, setShowMeta] = useState(!isMobile);
  const [localSettings, setLocalSettings] = useState<MemorySettings>(memorySettings);

  useEffect(() => {
    setLocalSettings(memorySettings);
  }, [memorySettings]);

  const recent5Chat = useMemo(
    () => sumUsages(tokenStats.recentChatUsages),
    [tokenStats.recentChatUsages]
  );

  const totalUsage = useMemo(
    () => mergeUsage(tokenStats.threadChatTotal, tokenStats.threadSummaryTotal),
    [tokenStats.threadChatTotal, tokenStats.threadSummaryTotal]
  );

  const handleLocalNumberChange = (
    key: keyof MemorySettings,
    value: string
  ) => {
    const nextValue = Number(value);

    setLocalSettings((prev) => ({
      ...prev,
      [key]: Number.isFinite(nextValue) ? nextValue : 0,
    }));
  };

  const handleSave = () => {
    const normalized = normalizeLocalSettings(localSettings);
    setLocalSettings(normalized);
    onSaveMemorySettings(normalized);
    setShowSettings(false);
  };

  const handleReset = () => {
    setLocalSettings(defaultMemorySettings);
    onResetMemorySettings();
    setShowSettings(false);
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: isMobile ? 0 : 8,
        overflow: "hidden",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: "#10a37f",
          color: "#fff",
          padding: "10px 12px",
          fontWeight: 700,
          flexShrink: 0,
          fontSize: 13,
        }}
      >
        ChatGPT
      </div>

      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid #eee",
          background: "rgba(248,255,252,0.8)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isMobile ? 0 : 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {currentKinLabel || "未選択"}
          </span>

          <span style={statusBadgeStyle(kinStatus)}>{kinStatus}</span>

          <span
            style={{
              fontSize: 11,
              color: "#666",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
            }}
            title={currentKin || ""}
          >
            {currentKin ? `ID: ${currentKin}` : ""}
          </span>

          <button
            type="button"
            style={buttonMemory}
            onClick={() => {
              if (showMeta) {
                setShowMeta(false);
                setShowSettings(false);
              } else {
                setShowMeta(true);
              }
            }}
          >
            {showMeta ? "詳細を閉じる" : "詳細"}
          </button>
        </div>

        {showMeta && (
          <>
            {isMobile && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <button
                  type="button"
                  style={buttonMemory}
                  onClick={() => setShowSettings((prev) => !prev)}
                >
                  {showSettings ? "memory設定を閉じる" : "memory設定"}
                </button>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr 1fr"
                  : "72px 72px minmax(0, 1.35fr) minmax(0, 1.35fr)",
                gap: 8,
                alignItems: "start",
                marginBottom: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={pillLabelStyle}>短期</div>
                <div style={compactValueStyle}>{gptState.recentMessages.length}</div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={pillLabelStyle}>長期</div>
                <div style={compactValueStyle}>{gptState.memory.facts.length}</div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={pillLabelStyle}>Topic</div>
                <div
                  style={{
                    ...longValueStyle,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={gptState.memory.context.currentTopic || "-"}
                >
                  {gptState.memory.context.currentTopic || "-"}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={pillLabelStyle}>Task</div>
                <div
                  style={{
                    ...longValueStyle,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={gptState.memory.context.currentTask || "-"}
                >
                  {gptState.memory.context.currentTask || "-"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 8,
                alignItems: "stretch",
              }}
            >
              <div style={tokenCardStyle}>
                <div style={tokenRowStyle}>
                  <div style={tokenLeftLabelStyle}>直近</div>
                  <div style={tokenLineStyle}>
                    <div>
                      1往復:{" "}
                      <UsageInline
                        usage={
                          tokenStats.lastChatUsage || {
                            inputTokens: 0,
                            outputTokens: 0,
                            totalTokens: 0,
                          }
                        }
                      />
                    </div>
                    <div>
                      5往復: <UsageInline usage={recent5Chat} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={tokenCardStyle}>
                <div style={tokenRowStyle}>
                  <div style={tokenLeftLabelStyle}>累計内訳</div>
                  <div style={tokenLineStyle}>
                    <div>
                      chat: <UsageInline usage={tokenStats.threadChatTotal} />
                    </div>
                    <div>
                      summary: <UsageInline usage={tokenStats.threadSummaryTotal} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={tokenCardStyle}>
                <div style={tokenRowStyle}>
                  <div style={tokenLeftLabelStyle}>全体累計</div>
                  <div style={tokenLineStyle}>
                    <div>
                      total: <UsageInline usage={totalUsage} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showSettings && (
          <div
            style={{
              marginTop: 10,
              border: "1px solid #dbe4e8",
              borderRadius: 10,
              background: "rgba(255,255,255,0.9)",
              padding: 10,
              maxHeight: isMobile ? "42dvh" : "none",
              overflowY: isMobile ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div>
                <div style={labelStyle}>MAX_FACTS</div>
                <input
                  type="number"
                  value={localSettings.maxFacts}
                  onChange={(e) =>
                    handleLocalNumberChange("maxFacts", e.target.value)
                  }
                  style={inputStyle}
                />
                <div style={helpTextStyle}>長期記憶 facts の最大数</div>
              </div>

              <div>
                <div style={labelStyle}>MAX_PREFERENCES</div>
                <input
                  type="number"
                  value={localSettings.maxPreferences}
                  onChange={(e) =>
                    handleLocalNumberChange("maxPreferences", e.target.value)
                  }
                  style={inputStyle}
                />
                <div style={helpTextStyle}>長期記憶 preferences の最大数</div>
              </div>

              <div>
                <div style={labelStyle}>CHAT_RECENT_LIMIT</div>
                <input
                  type="number"
                  value={localSettings.chatRecentLimit}
                  onChange={(e) =>
                    handleLocalNumberChange("chatRecentLimit", e.target.value)
                  }
                  style={inputStyle}
                />
                <div style={helpTextStyle}>recentMessages の保持件数</div>
              </div>

              <div>
                <div style={labelStyle}>SUMMARIZE_THRESHOLD</div>
                <input
                  type="number"
                  value={localSettings.summarizeThreshold}
                  onChange={(e) =>
                    handleLocalNumberChange("summarizeThreshold", e.target.value)
                  }
                  style={inputStyle}
                />
                <div style={helpTextStyle}>要約更新を走らせる閾値</div>
              </div>

              <div>
                <div style={labelStyle}>RECENT_KEEP</div>
                <input
                  type="number"
                  value={localSettings.recentKeep}
                  onChange={(e) =>
                    handleLocalNumberChange("recentKeep", e.target.value)
                  }
                  style={inputStyle}
                />
                <div style={helpTextStyle}>要約後に recent に残す件数</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <button type="button" style={buttonReset} onClick={handleReset}>
                初期化
              </button>
              <button type="button" style={buttonPrimary} onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        )}
      </div>

      <div
  style={{
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.82)",
    backgroundImage: 'url("/chat-bg.png")',
    backgroundRepeat: "repeat",
    backgroundSize: isMobile ? "170px auto" : "210px auto",
    backgroundPosition: "top left",
  }}
>
  <ChatMessages messages={gptMessages} bottomRef={gptBottomRef} />
</div>

      <div
        style={{
          paddingTop: isMobile ? 8 : 10,
          paddingLeft: isMobile ? 8 : 10,
          paddingRight: isMobile ? 8 : 10,
          paddingBottom: isMobile
            ? "calc(env(safe-area-inset-bottom, 0px) + 8px)"
            : 10,
          borderTop: "1px solid #eee",
          background: "rgba(255,255,255,0.82)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 40,
            flexWrap: "nowrap",
            overflowX: "auto",
            paddingBottom: 2,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "nowrap",
              minWidth: "max-content",
              alignItems: "center",
            }}
          >
            {isMobile && onSwitchPanel && (
              <button style={buttonSwitch} onClick={onSwitchPanel}>
                切替
              </button>
            )}

            <button
              type="button"
              style={buttonTranslate}
              onClick={() => sendToGpt("translate_explain")}
            >
              解説
            </button>

            <button
              type="button"
              style={buttonReply}
              onClick={() => sendToGpt("reply_only")}
            >
              返信案
            </button>

            <button
              type="button"
              style={buttonPolish}
              onClick={() => sendToGpt("polish")}
            >
              添削
            </button>

            <button
              type="button"
              style={buttonTransfer}
              onClick={sendLastGptToKinDraft}
            >
              Kinに戻す
            </button>

            <button
              type="button"
              style={buttonReset}
              onClick={resetGptForCurrentKin}
            >
              リセット
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button
            style={{
              ...buttonPrimary,
              borderRadius: 10,
              flexShrink: 0,
              opacity: loading ? 0.7 : 1,
            }}
            onClick={() => sendToGpt("normal")}
          >
            {loading ? "送信中..." : "送信"}
          </button>
        </div>

        <ChatTextarea
          value={gptInput}
          onChange={setGptInput}
          onSubmit={() => sendToGpt("normal")}
          submitOnEnter={!isMobile}
        />
      </div>
    </div>
  );
}