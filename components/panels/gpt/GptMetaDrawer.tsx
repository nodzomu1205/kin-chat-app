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

function MemoryListCard(props: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  const { title, items, emptyText } = props;

  return (
    <div style={tokenCardStyle}>
      <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ ...tokenMetaStyle, fontSize: 12 }}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: "#0f172a",
                padding: "8px 10px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NamedListValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string");
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "#0f172a",
              padding: "8px 10px",
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #dbe4e8",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {entries.map(([key, nestedValue]) => (
          <div
            key={key}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #dbe4e8",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#334155",
                marginBottom: 6,
              }}
            >
              {key}
            </div>
            <NamedListValue value={nestedValue} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        fontSize: 12,
        lineHeight: 1.6,
        color: "#0f172a",
      }}
    >
      {String(value ?? "-")}
    </div>
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
  listCount: number;
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
  listCount,
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
  const facts = Array.isArray(gptState.memory?.facts) ? gptState.memory.facts : [];
  const preferences = Array.isArray(gptState.memory?.preferences)
    ? gptState.memory.preferences
    : [];
  const namedLists =
    gptState.memory?.lists && typeof gptState.memory.lists === "object"
      ? Object.entries(gptState.memory.lists)
      : [];

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
            {" ・ "}
            collection groups {listCount}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>トピック</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory?.context?.currentTopic || "-"}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>目標</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory?.context?.currentTask || "-"}
          </div>
        </div>

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>直近の意図</div>
          <div style={{ ...longValueStyle, whiteSpace: "pre-wrap" }}>
            {gptState.memory?.context?.lastUserIntent || "-"}
          </div>
          {gptState.memory?.context?.followUpRule ? (
            <div style={{ ...tokenMetaStyle, marginTop: 10, lineHeight: 1.6 }}>
              follow-up rule: {gptState.memory.context.followUpRule}
            </div>
          ) : null}
        </div>

        <MemoryListCard
          title="Facts"
          items={facts}
          emptyText="会話から抽出された短い事実はまだありません。"
        />

        <MemoryListCard
          title="Preferences"
          items={preferences}
          emptyText="継続的な好みや出力条件はまだありません。"
        />

        <div style={tokenCardStyle}>
          <div style={{ ...tokenLeftLabelStyle, marginBottom: 8 }}>Collections</div>
          <div style={{ ...tokenMetaStyle, fontSize: 12, marginBottom: 10 }}>
            会話から拾った構造化メモです。検索語や、人物ごとの作品群のようなまとまりを置きます。
          </div>
          {namedLists.length === 0 ? (
            <div style={{ ...tokenMetaStyle, fontSize: 12 }}>
              構造化されたコレクションはまだありません。
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {namedLists.map(([name, value]) => (
                <div
                  key={name}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    {name}
                  </div>
                  <pre
                    style={{ display: "none" }}
                  >
                    {JSON.stringify(value, null, 2)}
                  </pre>
                  <NamedListValue value={value} />
                </div>
              ))}
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
