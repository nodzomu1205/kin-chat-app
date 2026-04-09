import React from "react";
import type { GptStateLike, TokenStats } from "./gptPanelTypes";
import {
  longValueStyle,
  tokenCardStyle,
  tokenLeftLabelStyle,
  tokenLineStyle,
  tokenMetaStyle,
} from "./gptPanelStyles";
import { formatNumber, mergeUsage } from "./gptPanelUtils";

type GptTopDrawerTab = "memory" | "tokens" | "settings" | null;

type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toTokenUsage(value: unknown): TokenUsage {
  if (!value || typeof value !== "object") {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  const obj = value as Record<string, unknown>;

  return {
    inputTokens: toNumber(obj.inputTokens),
    outputTokens: toNumber(obj.outputTokens),
    totalTokens: toNumber(obj.totalTokens),
  };
}

function UsageTriple({ usage }: { usage: TokenUsage }) {
  return (
    <>
      {formatNumber(usage.totalTokens)} / {formatNumber(usage.inputTokens)} /{" "}
      {formatNumber(usage.outputTokens)}
    </>
  );
}

function RunCount({ count }: { count: number }) {
  return (
    <span
      style={{
        color: "#64748b",
        fontWeight: 500,
      }}
    >
      （{count}回）
    </span>
  );
}

type Props = {
  mode: Exclude<GptTopDrawerTab, "settings" | null>;
  gptState: GptStateLike;
  tokenStats: TokenStats;
  recent5Chat: TokenUsage;
  totalUsage: TokenUsage;
  memoryUsed: number;
  memoryCapacity: number;
  recentCount: number;
  factCount: number;
  preferenceCount: number;
  chatRecentLimit: number;
  maxFacts: number;
  maxPreferences: number;
  showMemoryContent: boolean;
  onToggleMemoryContent: () => void;
  isMobile?: boolean;
};

export default function GptMetaDrawer({
  mode,
  gptState,
  tokenStats,
  recent5Chat,
  totalUsage,
  memoryUsed,
  memoryCapacity,
  recentCount,
  factCount,
  preferenceCount,
  chatRecentLimit,
  maxFacts,
  maxPreferences,
  showMemoryContent,
  onToggleMemoryContent,
  isMobile = false,
}: Props) {
  const searchTotal = toTokenUsage(tokenStats.threadSearchTotal);
  const taskTotal = toTokenUsage(tokenStats.threadTaskTotal);
  const summaryTotal = toTokenUsage(tokenStats.threadSummaryTotal);
  const ingestTotal = toTokenUsage(tokenStats.threadIngestTotal);
  const threadChatTotal = toTokenUsage(tokenStats.threadChatTotal);

  const conversationTrackedTotal = mergeUsage(threadChatTotal, summaryTotal);

  const otherTrackedTotal = mergeUsage(
    searchTotal,
    mergeUsage(taskTotal, ingestTotal)
  );

  const grandTotal = mergeUsage(conversationTrackedTotal, otherTrackedTotal);

  if (mode === "memory") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          alignItems: "start",
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
            <div style={tokenLeftLabelStyle}>メモリ容量</div>
            <div style={tokenLineStyle}>合計 {memoryUsed}/{memoryCapacity}</div>
          </div>
          <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
            recentMessages {recentCount}/{chatRecentLimit}
            {" ・ "}
            facts {factCount}/{maxFacts}
            {" ・ "}
            preferences {preferenceCount}/{maxPreferences}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>トピック</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory?.context?.currentTopic || "-"}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>現在タスク</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory?.context?.currentTask || "-"}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={tokenLeftLabelStyle}>メモリ詳細</div>

            <button
              type="button"
              onClick={onToggleMemoryContent}
              style={{
                border: "1px solid #d1d5db",
                background: "#fff",
                borderRadius: 999,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "#475569",
              }}
            >
              {showMemoryContent ? "閉じる" : "開く"}
            </button>
          </div>

          {showMemoryContent && (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.6,
                color: "#0f172a",
                maxHeight: isMobile ? "28dvh" : "32dvh",
                overflowY: "auto",
              }}
            >
              {JSON.stringify(gptState.memory ?? {}, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
        alignItems: "start",
      }}
    >
      <div style={{ ...tokenLineStyle, padding: "0 2px" }}>
        総トークン消費 <UsageTriple usage={grandTotal} />
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
          <div style={tokenLeftLabelStyle}>会話トークン消費</div>
          <div style={tokenMetaStyle}>(合計 / IN / OUT)</div>
        </div>

        <div style={{ ...tokenLineStyle, marginBottom: 8 }}>
          累積 <UsageTriple usage={conversationTrackedTotal} />
        </div>

        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          直近1往復 <UsageTriple usage={toTokenUsage(tokenStats.lastChatUsage)} />
          <br />
          直近5往復 <UsageTriple usage={recent5Chat} />
          <br />
          要約 <RunCount count={toNumber(tokenStats.summaryRunCount)} />{" "}
          <UsageTriple usage={summaryTotal} />
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
          <div style={tokenLeftLabelStyle}>その他トークン消費</div>
          <div style={tokenMetaStyle}>(合計 / IN / OUT)</div>
        </div>

        <div style={{ ...tokenLineStyle, marginBottom: 8 }}>
          累積 <UsageTriple usage={otherTrackedTotal} />
        </div>

        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          検索 <RunCount count={toNumber(tokenStats.searchRunCount)} />{" "}
          <UsageTriple usage={searchTotal} />
          <br />
          注入 <RunCount count={toNumber(tokenStats.ingestRunCount)} />{" "}
          <UsageTriple usage={ingestTotal} />
          <br />
          タスク <RunCount count={toNumber(tokenStats.taskRunCount)} />{" "}
          <UsageTriple usage={taskTotal} />
        </div>
      </div>
    </div>
  );
}
