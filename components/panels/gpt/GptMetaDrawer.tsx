import React from "react";
import type { KinMemoryState } from "@/types/chat";
import type { TokenUsage } from "@/hooks/useGptMemory";
import type { GptTopDrawerTab, TokenStats } from "./gptPanelTypes";
import {
  longValueStyle,
  tokenCardStyle,
  tokenLeftLabelStyle,
  tokenLineStyle,
  tokenMetaStyle,
} from "./gptPanelStyles";
import { formatNumber, mergeUsage } from "./gptPanelUtils";

function UsageTriple({ usage }: { usage: TokenUsage }) {
  return (
    <>
      {formatNumber(usage.totalTokens)} / {formatNumber(usage.inputTokens)} /{" "}
      {formatNumber(usage.outputTokens)}
    </>
  );
}

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

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
  mode: Exclude<GptTopDrawerTab, "settings" | "task_status" | null>;
  gptState: KinMemoryState;
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
  const searchTotal = tokenStats.threadSearchTotal;
  const taskTotal = tokenStats.threadTaskTotal;
  const summaryTotal = tokenStats.threadSummaryTotal;
  const ingestTotal = tokenStats.threadIngestTotal;

  const conversationTrackedTotal = mergeUsage(
    tokenStats.threadChatTotal,
    summaryTotal
  );

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
            <div style={tokenLeftLabelStyle}>メモリ占有</div>
            <div style={tokenLineStyle}>合計 {memoryUsed}/{memoryCapacity}</div>
          </div>
          <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
            直近チャット {recentCount}/{chatRecentLimit}
            {" ・ "}
            ファクト {factCount}/{maxFacts}
            {" ・ "}
            好み {preferenceCount}/{maxPreferences}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>トピック</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory.context.currentTopic || "-"}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>目標</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory.context.currentTask || "-"}
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
            <div style={tokenLeftLabelStyle}>メモリ内容</div>

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
              {JSON.stringify(gptState.memory, null, 2)}
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
          <div style={tokenMetaStyle}>（合計 / IN / OUT）</div>
        </div>

        <div style={{ ...tokenLineStyle, marginBottom: 8 }}>
          累積 <UsageTriple usage={conversationTrackedTotal} />
        </div>

        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          直近1往復 <UsageTriple usage={tokenStats.lastChatUsage || ZERO_USAGE} />
          <br />
          直近5往復 <UsageTriple usage={recent5Chat} />
          <br />
          要約 <RunCount count={tokenStats.summaryRunCount} />{" "}
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
          <div style={tokenMetaStyle}>（合計 / IN / OUT）</div>
        </div>

        <div style={{ ...tokenLineStyle, marginBottom: 8 }}>
          累積 <UsageTriple usage={otherTrackedTotal} />
        </div>

        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          検索 <RunCount count={tokenStats.searchRunCount} />{" "}
          <UsageTriple usage={searchTotal} />
          <br />
          注入 <RunCount count={tokenStats.ingestRunCount} />{" "}
          <UsageTriple usage={ingestTotal} />
          <br />
          タスク <RunCount count={tokenStats.taskRunCount} />{" "}
          <UsageTriple usage={taskTotal} />
        </div>
      </div>
    </div>
  );
}
