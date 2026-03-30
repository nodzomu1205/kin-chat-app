import React from "react";
import type { KinMemoryState } from "@/types/chat";
import type { TokenUsage } from "@/hooks/useGptMemory";
import type { TokenStats } from "./gptPanelTypes";
import {
  longValueStyle,
  tokenCardStyle,
  tokenLeftLabelStyle,
  tokenLineStyle,
  tokenMetaStyle,
} from "./gptPanelStyles";
import { formatNumber } from "./gptPanelUtils";

function UsageTriple({ usage }: { usage: TokenUsage }) {
  return (
    <>
      {formatNumber(usage.totalTokens)} / {formatNumber(usage.inputTokens)} /{" "}
      {formatNumber(usage.outputTokens)}
    </>
  );
}

type Props = {
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
  isMobile?: boolean;
};

export default function GptMetaDrawer({
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
  isMobile = false,
}: Props) {
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
          累積 <UsageTriple usage={tokenStats.threadChatTotal} />
        </div>
        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          直近1往復{" "}
          <UsageTriple
            usage={
              tokenStats.lastChatUsage || {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
              }
            }
          />
          <br />
          直近5往復 <UsageTriple usage={recent5Chat} />
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
          <div style={tokenLeftLabelStyle}>全トークン累積消費</div>
          <div style={tokenMetaStyle}>（合計 / IN / OUT）</div>
        </div>
        <div style={{ ...tokenLineStyle, marginBottom: 8 }}>
          総合計 <UsageTriple usage={totalUsage} />
        </div>
        <div style={{ ...tokenMetaStyle, fontSize: 12, lineHeight: 1.8 }}>
          会話トークン累積 <UsageTriple usage={tokenStats.threadChatTotal} />
          <br />
          圧縮メモリ作成 <UsageTriple usage={tokenStats.threadSummaryTotal} />
          {"  "}（計 {tokenStats.summaryRunCount} 回）
        </div>
      </div>

      <div style={tokenCardStyle}>
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>トピック</div>
        <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
          {gptState.memory.context.currentTopic || "-"}
        </div>
      </div>

      <div style={tokenCardStyle}>
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>タスク</div>
        <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
          {gptState.memory.context.currentTask || "-"}
        </div>
      </div>

      <div style={tokenCardStyle}>
        <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>メモリ内容</div>
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
      </div>
    </div>
  );
}
