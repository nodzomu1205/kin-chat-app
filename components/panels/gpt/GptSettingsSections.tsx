"use client";

import React from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memoryInterpreterRules";
import {
  SEARCH_MODE_PRESETS,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { LibraryReferenceMode } from "./gptPanelTypes";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";

const sectionCard: React.CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 12,
  background: "rgba(255,255,255,0.92)",
  padding: 12,
};

const subtleCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fbfdff",
  padding: 12,
};

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  padding: "0 12px",
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

const tabButton = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: 999,
  border: active ? "1px solid #67e8f9" : "1px solid #cbd5e1",
  background: active ? "#ecfeff" : "#fff",
  color: active ? "#155e75" : "#475569",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 12px",
  cursor: "pointer",
  lineHeight: 1,
});

function getCandidateIntentValue(candidate: PendingMemoryRuleCandidate): UserUtteranceIntent {
  if (candidate.intent) return candidate.intent;
  if (candidate.kind === "closing_reply") return "acknowledgement";
  if (candidate.kind === "topic_alias") return "question";
  return "unknown";
}

function getCandidateTopicDecisionValue(candidate: PendingMemoryRuleCandidate): TopicDecision {
  if (candidate.topicDecision) return candidate.topicDecision;
  if (candidate.kind === "closing_reply") return "keep";
  if (candidate.kind === "topic_alias") return "switch";
  return "unclear";
}

function ToggleButtons(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  help?: string;
}) {
  return (
    <div style={subtleCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{props.label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          style={tabButton(props.checked)}
          onClick={() => props.onChange(true)}
        >
          ON
        </button>
        <button
          type="button"
          style={tabButton(!props.checked)}
          onClick={() => props.onChange(false)}
        >
          OFF
        </button>
      </div>
      {props.help ? (
        <div style={{ ...helpTextStyle, marginTop: 8 }}>{props.help}</div>
      ) : null}
    </div>
  );
}

const SEARCH_ENGINES: SearchEngine[] = [
  "google_search",
  "google_ai_mode",
  "google_news",
  "google_maps",
  "google_local",
  "youtube_search",
];

export function SearchSettingsSection(props: {
  isMobile?: boolean;
  activeSearchMode: PrimarySearchMode | undefined;
  searchLocation: string;
  searchEngines: SearchEngine[];
  sourceDisplayCountInput: string;
  onSetSearchPreset: (mode: PrimarySearchMode) => void;
  onToggleSearchEngine: (engine: SearchEngine) => void;
  onChangeSearchLocation: (value: string) => void;
  onChangeSourceDisplayCountInput: (value: string) => void;
  onCommitSourceDisplayCount: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>検索プリセット</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["normal", "ai", "integrated", "news", "geo", "youtube"] as PrimarySearchMode[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                style={tabButton(props.activeSearchMode === mode)}
                onClick={() => props.onSetSearchPreset(mode)}
              >
                {mode === "normal"
                  ? "通常"
                  : mode === "ai"
                    ? "AI"
                    : mode === "integrated"
                      ? "統合"
                      : mode === "news"
                        ? "News"
                        : mode === "geo"
                          ? "Maps / Local"
                          : "YouTube"}
              </button>
            )
          )}
        </div>
      </div>
      <div style={sectionCard}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: props.isMobile
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={labelStyle}>Location</div>
            <input
              value={props.searchLocation}
              onChange={(e) => props.onChangeSearchLocation(e.target.value)}
              placeholder="例: Japan / Johannesburg, South Africa"
              style={inputStyle}
            />
            <div style={helpTextStyle}>
              Protocol の `LOCATION` も自然な地名表記で指定します。
            </div>
          </div>
          <div>
            <div style={labelStyle}>Engines</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {SEARCH_ENGINES.map((engine) => (
                <button
                  key={engine}
                  type="button"
                  style={tabButton(props.searchEngines.includes(engine))}
                  onClick={() => props.onToggleSearchEngine(engine)}
                >
                  {engine}
                </button>
              ))}
            </div>
            <div style={helpTextStyle}>
              利用可能: `google_search / google_ai_mode / google_news / google_maps / google_local / youtube_search`
            </div>
          </div>
          <div>
            <div style={labelStyle}>リンク表示件数</div>
            <input
              inputMode="numeric"
              value={props.sourceDisplayCountInput}
              onChange={(e) =>
                props.onChangeSourceDisplayCountInput(
                  e.target.value.replace(/[^\d]/g, "")
                )
              }
              onBlur={props.onCommitSourceDisplayCount}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  props.onCommitSourceDisplayCount();
                }
              }}
              style={inputStyle}
            />
            <div style={helpTextStyle}>
              検索結果カードや参考リンクカードで表示する件数です。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibrarySettingsSection(props: {
  isMobile?: boolean;
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceMode: LibraryReferenceMode;
  libraryIndexResponseCount: number;
  libraryReferenceCount: number;
  libraryStorageMB: number;
  libraryReferenceEstimatedTokens: number;
  onChangeAutoLibraryReferenceEnabled: (value: boolean) => void;
  onChangeLibraryReferenceMode: (value: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (value: number) => void;
  onChangeLibraryReferenceCount: (value: number) => void;
}) {
  return (
    <div style={sectionCard}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: props.isMobile
            ? "1fr"
            : "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <ToggleButtons
          label="ライブラリ自動参照"
          checked={props.autoLibraryReferenceEnabled}
          onChange={props.onChangeAutoLibraryReferenceEnabled}
          help="Kin作成文書・注入文書・検索データをまとめてライブラリとして扱います。"
        />
        <div style={subtleCard}>
          <div style={labelStyle}>ライブラリ参照モード</div>
          <select
            value={props.libraryReferenceMode}
            onChange={(e) =>
              props.onChangeLibraryReferenceMode(
                e.target.value as LibraryReferenceMode
              )
            }
            style={selectStyle}
          >
            <option value="summary_only">summary only</option>
            <option value="summary_with_excerpt">summary + excerpt</option>
          </select>
        </div>
        <div>
          <div style={labelStyle}>ライブラリ index 件数</div>
          <input
            inputMode="numeric"
            value={String(props.libraryIndexResponseCount)}
            onChange={(e) =>
              props.onChangeLibraryIndexResponseCount(
                Number(e.target.value.replace(/[^\d]/g, "") || 1)
              )
            }
            style={inputStyle}
          />
        </div>
        <div>
          <div style={labelStyle}>ライブラリ参照件数</div>
          <input
            inputMode="numeric"
            value={String(props.libraryReferenceCount)}
            onChange={(e) =>
              props.onChangeLibraryReferenceCount(
                Number(e.target.value.replace(/[^\d]/g, "") || 0)
              )
            }
            style={inputStyle}
          />
        </div>
        <div>
          <div style={labelStyle}>ライブラリ容量</div>
          <div
            style={{
              ...inputStyle,
              display: "flex",
              alignItems: "center",
              background: "#f8fafc",
              fontWeight: 800,
            }}
          >
            {props.libraryStorageMB.toFixed(3)} MB
          </div>
        </div>
        <div>
          <div style={labelStyle}>ライブラリ推定トークン</div>
          <div
            style={{
              ...inputStyle,
              display: "flex",
              alignItems: "center",
              background: "#f8fafc",
              fontWeight: 800,
            }}
          >
            約 {props.libraryReferenceEstimatedTokens}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RulesSettingsSection(props: {
  memoryInterpreterSettings: MemoryInterpreterSettings;
  pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
  approvedMemoryRules: ApprovedMemoryRule[];
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  showApprovedMemoryRules: boolean;
  showApprovedIntentRules: boolean;
  onToggleApprovedMemoryRules: () => void;
  onToggleApprovedIntentRules: () => void;
  onChangeMemoryInterpreterSettings: (
    patch: Partial<MemoryInterpreterSettings>
  ) => void;
  onApproveMemoryRuleCandidate: (id: string) => void;
  onRejectMemoryRuleCandidate: (id: string) => void;
  onUpdateMemoryRuleCandidate: (
    id: string,
    patch: Partial<PendingMemoryRuleCandidate>
  ) => void;
  onDeleteApprovedMemoryRule: (id: string) => void;
  onApproveIntentCandidate: (id: string) => void;
  onRejectIntentCandidate: (id: string) => void;
  onDeleteApprovedIntentPhrase: (id: string) => void;
  isMobile?: boolean;
}) {
  const intentOptions: UserUtteranceIntent[] = [
    "agreement",
    "disagreement",
    "question",
    "request",
    "statement",
    "suggestion",
    "acknowledgement",
    "unknown",
  ];
  const topicDecisionOptions: TopicDecision[] = ["keep", "switch", "unclear"];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Memory Interpreter</div>
        <div style={{ display: "grid", gap: 10 }}>
          <ToggleButtons
            label="LLM fallback"
            checked={props.memoryInterpreterSettings.llmFallbackEnabled}
            onChange={(value) =>
              props.onChangeMemoryInterpreterSettings({
                llmFallbackEnabled: value,
              })
            }
            help="曖昧な topic / closing reply を LLM に回して補強します。"
          />
          <ToggleButtons
            label="候補を保存"
            checked={props.memoryInterpreterSettings.saveRuleCandidates}
            onChange={(value) =>
              props.onChangeMemoryInterpreterSettings({
                saveRuleCandidates: value,
              })
            }
            help="LLM fallback が見つけた Memory ルール候補を承認キューへ残します。"
          />
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Memory ルール候補</div>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Memory 精査候補</div>
        <div style={{ ...helpTextStyle, marginBottom: 8 }}>
          曖昧な文面について、今後この表現を LLM 補助で精査してよいかを確認します。
        </div>
        {props.pendingMemoryRuleCandidates.length === 0 ? (
          <div style={helpTextStyle}>
            現在、承認待ちの Memory ルール候補はありません。
          </div>
        ) : (
          props.pendingMemoryRuleCandidates.map((candidate) => (
            <div key={candidate.id} style={{ ...subtleCard, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {candidate.kind === "utterance_review"
                  ? "発話レビュー候補"
                  : candidate.kind === "topic_alias"
                    ? "topic 精査候補"
                    : "closing reply 精査候補"}
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                入力文: {candidate.phrase}
              </div>
              <div
                style={{
                  ...helpTextStyle,
                  marginTop: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {candidate.sourceText}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: props.isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <div>
                  <div style={labelStyle}>ユーザー意図</div>
                  <select
                    value={getCandidateIntentValue(candidate)}
                    onChange={(e) =>
                      props.onUpdateMemoryRuleCandidate(candidate.id, {
                        kind: "utterance_review",
                        intent: e.target.value as UserUtteranceIntent,
                      })
                    }
                    style={selectStyle}
                  >
                    {intentOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>トピック判定</div>
                  <select
                    value={getCandidateTopicDecisionValue(candidate)}
                    onChange={(e) =>
                      props.onUpdateMemoryRuleCandidate(candidate.id, {
                        kind: "utterance_review",
                        topicDecision: e.target.value as TopicDecision,
                      })
                    }
                    style={selectStyle}
                  >
                    {topicDecisionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: props.isMobile ? undefined : "1 / -1" }}>
                  <div style={labelStyle}>トピック</div>
                  <input
                    value={candidate.normalizedValue || ""}
                    onChange={(e) =>
                      props.onUpdateMemoryRuleCandidate(candidate.id, {
                        kind: "utterance_review",
                        normalizedValue: e.target.value,
                      })
                    }
                    placeholder="keep の場合は空のまま"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={buttonPrimary}
                  onClick={() => props.onApproveMemoryRuleCandidate(candidate.id)}
                >
                  確定
                </button>
                <button
                  type="button"
                  style={buttonSecondaryWide}
                  onClick={() => props.onRejectMemoryRuleCandidate(candidate.id)}
                >
                  却下
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={sectionCard}>
        <div style={{ ...helpTextStyle, marginBottom: 8 }}>
          許可すると、似た表現が来た時に LLM 補助で topic や facts の整理を改善します。
        </div>
        <button
          type="button"
          style={tabButton(props.showApprovedMemoryRules)}
          onClick={props.onToggleApprovedMemoryRules}
        >
          {props.showApprovedMemoryRules
            ? "承認済み Memory ルールを閉じる"
            : `承認済み Memory ルールを表示 (${props.approvedMemoryRules.length})`}
        </button>
        {props.showApprovedMemoryRules ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {props.approvedMemoryRules.map((rule) => (
              <div key={rule.id} style={subtleCard}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
                  {rule.kind === "utterance_review"
                    ? "発話レビュー"
                    : rule.kind === "topic_alias"
                      ? "topic 精査"
                      : "closing reply 精査"}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 6 }}>
                  入力文: {rule.phrase}
                </div>
                {rule.intent ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>
                    意図: {rule.intent}
                  </div>
                ) : null}
                {rule.topicDecision ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>
                    トピック判定: {rule.topicDecision}
                  </div>
                ) : null}
                {rule.normalizedValue ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>
                    トピック候補: {rule.normalizedValue}
                  </div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <div style={helpTextStyle}>
                    作成日: {rule.createdAt.slice(0, 10)}
                  </div>
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDeleteApprovedMemoryRule(rule.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>
          SYSフォーマットルール候補
        </div>
        <div style={{ ...helpTextStyle, marginBottom: 8 }}>
          こちらは SYS フォーマット自動生成の候補です。Memory 精査候補とは役割が別です。
        </div>
        {props.pendingIntentCandidates.length === 0 ? (
          <div style={helpTextStyle}>
            現在、SYSフォーマットルール候補はありません。
          </div>
        ) : (
          props.pendingIntentCandidates.map((candidate) => (
            <div key={candidate.id} style={{ ...subtleCard, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {candidate.kind} / {candidate.phrase}
              </div>
              <div
                style={{
                  ...helpTextStyle,
                  marginTop: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {candidate.sourceText}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={buttonPrimary}
                  onClick={() => props.onApproveIntentCandidate(candidate.id)}
                >
                  承認
                </button>
                <button
                  type="button"
                  style={buttonSecondaryWide}
                  onClick={() => props.onRejectIntentCandidate(candidate.id)}
                >
                  却下
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={sectionCard}>
        <button
          type="button"
          style={tabButton(props.showApprovedIntentRules)}
          onClick={props.onToggleApprovedIntentRules}
        >
          {props.showApprovedIntentRules
            ? "承認済み SYSルールを閉じる"
            : `承認済み SYSルールを表示 (${props.approvedIntentPhrases.length})`}
        </button>
        {props.showApprovedIntentRules ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {props.approvedIntentPhrases.map((phrase) => (
              <div key={phrase.id} style={subtleCard}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
                  {phrase.kind} / {phrase.phrase}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <div style={helpTextStyle}>
                    作成日: {phrase.createdAt.slice(0, 10)}
                  </div>
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDeleteApprovedIntentPhrase(phrase.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProtocolSettingsSection(props: {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
  autoCopyFileIngestSysInfoToKin: boolean;
  protocolPrompt: string;
  protocolRulebook: string;
  onChangeAutoSendKinSysInput: (value: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (value: boolean) => void;
  onChangeAutoSendGptSysInput: (value: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (value: boolean) => void;
  onChangeAutoCopyFileIngestSysInfoToKin: (value: boolean) => void;
  onChangeProtocolPrompt: (value: string) => void;
  onChangeProtocolRulebook: (value: string) => void;
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>自動化</div>
        <div style={{ display: "grid", gap: 10 }}>
          <ToggleButtons
            label="A. Kin入力欄の SYS を自動送信"
            checked={props.autoSendKinSysInput}
            onChange={props.onChangeAutoSendKinSysInput}
            help="Kin入力欄に SYS ブロックが入ったら自動送信します。"
          />
          <ToggleButtons
            label="B. Kin最新レスの SYS を GPT入力欄へ自動転記"
            checked={props.autoCopyKinSysResponseToGpt}
            onChange={props.onChangeAutoCopyKinSysResponseToGpt}
            help="Kin の最新メッセージが SYS ブロックなら GPT入力欄へ下書き転記します。"
          />
          <ToggleButtons
            label="C. GPT入力欄の SYS を自動送信"
            checked={props.autoSendGptSysInput}
            onChange={props.onChangeAutoSendGptSysInput}
            help="GPT入力欄に SYS ブロックが入ったら自動送信します。"
          />
          <ToggleButtons
            label="D. GPT最新レスの SYS を Kin入力欄へ自動転記"
            checked={props.autoCopyGptSysResponseToKin}
            onChange={props.onChangeAutoCopyGptSysResponseToKin}
            help="GPT の最新メッセージが SYS ブロックなら Kin入力欄へ下書き転記します。"
          />
          <ToggleButtons
            label="E. 書類取込時にKin入力欄へ自動転記（SYS_INFOフォーマット）"
            checked={props.autoCopyFileIngestSysInfoToKin}
            onChange={props.onChangeAutoCopyFileIngestSysInfoToKin}
            help="書類取込後、共有用の SYS_INFO を Kin入力欄へ自動セットします。"
          />
        </div>
      </div>

      <div style={sectionCard}>
        <div style={labelStyle}>プロンプト</div>
        <textarea
          value={props.protocolPrompt}
          onChange={(e) => props.onChangeProtocolPrompt(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 120 }}
        />
      </div>

      <div style={sectionCard}>
        <div style={labelStyle}>ルールブック</div>
        <textarea
          value={props.protocolRulebook}
          onChange={(e) => props.onChangeProtocolRulebook(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 260 }}
        />
        <div style={{ ...helpTextStyle, marginTop: 8 }}>
          検索プロトコルでは `ENGINE: google_search / google_ai_mode / google_news / google_local` と `LOCATION: Japan` のような自然な地名表記を使います。
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={props.onResetProtocolDefaults}
        >
          既定値に戻す
        </button>
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={props.onSaveProtocolDefaults}
        >
          既定値として保存
        </button>
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={() => void props.onSetProtocolRulebookToKinDraft()}
        >
          Kin入力欄へセット
        </button>
        <button
          type="button"
          style={buttonPrimary}
          onClick={() => void props.onSendProtocolRulebookToKin()}
        >
          SYS_INFO として送信
        </button>
      </div>
    </div>
  );
}

export { SEARCH_MODE_PRESETS, tabButton, sectionCard, subtleCard, selectStyle };
