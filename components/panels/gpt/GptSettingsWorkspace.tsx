"use client";

import React from "react";
import type {
  FileReadPolicy,
  GptPanelProtocolProps,
  GptPanelSettingsProps,
  ImageDetail,
  IngestMode,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import {
  LibrarySettingsSection,
  ProtocolSettingsSection,
  SearchSettingsSection,
  SEARCH_MODE_PRESETS,
  sectionCard,
  subtleCard,
  selectStyle,
  tabButton,
} from "@/components/panels/gpt/GptSettingsSections";
import {
  inferPrimarySearchModeFromEngines,
  isPrimarySearchMode,
  normalizeStoredSearchMode,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";
import type {
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memoryInterpreterRules";

export type SettingsWorkspaceView = "chat" | "task" | "library";

type Props = {
  activeView: SettingsWorkspaceView;
  settings: GptPanelSettingsProps;
  protocol: GptPanelProtocolProps;
  localSettings: LocalMemorySettingsInput;
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalMemorySettingsInput>>;
  memoryCapacityPreview: number;
  toPositiveInt: (value: string, fallback: number) => number;
  isMobile?: boolean;
  onClose: () => void;
};

type ApprovalSectionApprovedItem = {
  id: string;
  title: string;
  meta?: string;
  extra?: string;
  createdAt?: string;
};

type ApprovalSectionPendingItem = {
  id: string;
  title: string;
  meta?: string;
  extra?: string;
  sourceText: string;
};

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

function formatIntentLabel(intent: UserUtteranceIntent) {
  switch (intent) {
    case "agreement":
      return "同意";
    case "disagreement":
      return "否定";
    case "question":
      return "質問";
    case "request":
      return "依頼";
    case "statement":
      return "叙述";
    case "suggestion":
      return "提案";
    case "acknowledgement":
      return "相槌";
    default:
      return "不明";
  }
}

function formatTopicDecisionLabel(decision: TopicDecision) {
  switch (decision) {
    case "keep":
      return "維持";
    case "switch":
      return "切替";
    default:
      return "保留";
  }
}

function NumberField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <input
        inputMode="numeric"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={inputStyle}
      />
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

function IngestSettingsSection(props: {
  isMobile?: boolean;
  ingestMode: IngestMode;
  onChangeIngestMode: (v: IngestMode) => void;
  imageDetail: ImageDetail;
  onChangeImageDetail: (v: ImageDetail) => void;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeCompactCharLimit: (v: number) => void;
  onChangeSimpleImageCharLimit: (v: number) => void;
  fileReadPolicy: FileReadPolicy;
  onChangeFileReadPolicy: (v: FileReadPolicy) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={labelStyle}>ファイル読み取り方針</div>
          <select
            value={props.fileReadPolicy}
            onChange={(e) =>
              props.onChangeFileReadPolicy(e.target.value as FileReadPolicy)
            }
            style={selectStyle}
          >
            <option value="text_first">テキスト優先</option>
            <option value="visual_first">見た目優先</option>
            <option value="text_and_layout">両方</option>
          </select>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: props.isMobile
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={subtleCard}>
            <div style={labelStyle}>テキスト取込</div>
            <select
              value={props.ingestMode}
              onChange={(e) =>
                props.onChangeIngestMode(e.target.value as IngestMode)
              }
              style={selectStyle}
            >
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </select>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label="文字数上限"
                value={String(props.compactCharLimit)}
                onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))}
              />
            </div>
          </div>
          <div style={subtleCard}>
            <div style={labelStyle}>画像 / PDF 取込</div>
            <select
              value={props.imageDetail}
              onChange={(e) =>
                props.onChangeImageDetail(e.target.value as ImageDetail)
              }
              style={selectStyle}
            >
              <option value="simple">simple</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </select>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label="文字数上限"
                value={String(props.simpleImageCharLimit)}
                onChange={(v) =>
                  props.onChangeSimpleImageCharLimit(Number(v || 0))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleApprovalSection(props: {
  sectionTitle: string;
  approvedLabel: string;
  pendingLabel: string;
  approvedCount: number;
  pendingCount: number;
  showApproved: boolean;
  onToggleApproved: () => void;
  approvedEmptyText: string;
  pendingEmptyText: string;
  approvedItems: ApprovalSectionApprovedItem[];
  pendingItems: ApprovalSectionPendingItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>{props.sectionTitle}</div>
          <span
            style={{
              borderRadius: 999,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {props.approvedLabel} {props.approvedCount}
          </span>
          <span
            style={{
              borderRadius: 999,
              background: props.pendingCount > 0 ? "#fef3c7" : "#f1f5f9",
              color: props.pendingCount > 0 ? "#92400e" : "#475569",
              border: `1px solid ${props.pendingCount > 0 ? "#fcd34d" : "#cbd5e1"}`,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {props.pendingLabel} {props.pendingCount}
          </span>
        </div>
        <button
          type="button"
          style={tabButton(props.showApproved)}
          onClick={props.onToggleApproved}
        >
          {props.showApproved ? "承認済みを閉じる" : "承認済みを表示"}
        </button>
      </div>

      {props.showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedItems.length === 0 ? (
            <div style={helpTextStyle}>{props.approvedEmptyText}</div>
          ) : (
            props.approvedItems.map((item) => (
              <div key={item.id} style={subtleCard}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{item.title}</div>
                {item.meta ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>{item.meta}</div>
                ) : null}
                {item.extra ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>{item.extra}</div>
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
                    {item.createdAt ? `登録日: ${item.createdAt.slice(0, 10)}` : ""}
                  </div>
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDelete(item.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>承認待ち</div>
      {props.pendingItems.length === 0 ? (
        <div style={helpTextStyle}>{props.pendingEmptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {props.pendingItems.map((item) => (
            <div key={item.id} style={subtleCard}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>{item.title}</div>
              {item.meta ? (
                <div style={{ ...helpTextStyle, marginTop: 6 }}>{item.meta}</div>
              ) : null}
              {item.extra ? (
                <div style={{ ...helpTextStyle, marginTop: 6 }}>{item.extra}</div>
              ) : null}
              <div
                style={{
                  ...helpTextStyle,
                  marginTop: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {item.sourceText}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ ...helpTextStyle, width: "100%", marginTop: 0 }}>
                  左が確定、右が却下です。
                </div>
                <button
                  type="button"
                  style={buttonPrimary}
                  onClick={() => props.onApprove(item.id)}
                >
                  承認
                </button>
                <button
                  type="button"
                  style={buttonSecondaryWide}
                  onClick={() => props.onReject(item.id)}
                >
                  却下
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryApprovalSection(props: {
  currentTopic?: string;
  isMobile?: boolean;
  pendingCount: number;
  approvedCount: number;
  showApproved: boolean;
  onToggleApproved: () => void;
  approvedRules: GptPanelSettingsProps["approvedMemoryRules"];
  pendingCandidates: GptPanelSettingsProps["pendingMemoryRuleCandidates"];
  onUpdate: (id: string, patch: Partial<PendingMemoryRuleCandidate>) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
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
  const currentTopic = props.currentTopic?.trim() || "";
  const originalSuggestedTopicRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    props.pendingCandidates.forEach((candidate) => {
      if (
        candidate.kind === "utterance_review" &&
        typeof originalSuggestedTopicRef.current[candidate.id] === "undefined"
      ) {
        originalSuggestedTopicRef.current[candidate.id] = candidate.normalizedValue || "";
      }
    });
  }, [props.pendingCandidates]);

  const resolveCandidateTopicInputValue = React.useCallback(
    (candidate: PendingMemoryRuleCandidate) => {
      const decision = getCandidateTopicDecisionValue(candidate);
      const originalSuggested = originalSuggestedTopicRef.current[candidate.id] || "";
      const currentValue = candidate.normalizedValue || "";

      if (decision === "switch") return currentValue || originalSuggested;
      if (currentValue && currentValue !== originalSuggested) return currentValue;
      return currentTopic || currentValue;
    },
    [currentTopic]
  );

  return (
    <div style={sectionCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>文脈レビュー</div>
          <span
            style={{
              borderRadius: 999,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            承認済み {props.approvedCount}
          </span>
          <span
            style={{
              borderRadius: 999,
              background: props.pendingCount > 0 ? "#fef3c7" : "#f1f5f9",
              color: props.pendingCount > 0 ? "#92400e" : "#475569",
              border: `1px solid ${props.pendingCount > 0 ? "#fcd34d" : "#cbd5e1"}`,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            承認待ち {props.pendingCount}
          </span>
        </div>
        <button
          type="button"
          style={tabButton(props.showApproved)}
          onClick={props.onToggleApproved}
        >
          {props.showApproved ? "承認済みを閉じる" : "承認済みを表示"}
        </button>
      </div>

      {props.showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedRules.length === 0 ? (
            <div style={helpTextStyle}>登録済みの文脈レビューはありません。</div>
          ) : (
            props.approvedRules.map((rule) => (
              <div key={rule.id} style={subtleCard}>
                <div
                  style={{
                    display: "none",
                    marginBottom: 8,
                    borderRadius: 10,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ ...helpTextStyle, marginTop: 0 }}>
                    実際のコメント: {rule.phrase}
                  </div>
                  {rule.intent ? (
                    <div style={{ ...helpTextStyle, marginTop: 4 }}>
                      ユーザー意図: {rule.intent}
                    </div>
                  ) : null}
                  {rule.topicDecision ? (
                    <div style={{ ...helpTextStyle, marginTop: 4 }}>
                      トピック判定: {rule.topicDecision}
                    </div>
                  ) : null}
                  {rule.normalizedValue ? (
                    <div style={{ ...helpTextStyle, marginTop: 4 }}>
                      トピック: {rule.normalizedValue}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
                  {rule.kind === "utterance_review" ? "utterance review" : rule.kind}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 6 }}>入力語: {rule.phrase}</div>
                {rule.intent ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>意図: {rule.intent}</div>
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
                  <div style={helpTextStyle}>登録日: {rule.createdAt.slice(0, 10)}</div>
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDelete(rule.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>承認待ち</div>
      {props.pendingCandidates.length === 0 ? (
        <div style={helpTextStyle}>未対応の文脈候補はありません。</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {props.pendingCandidates.map((candidate) => (
            <div key={candidate.id} style={subtleCard}>
              <div
                style={{
                  display: "none",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: "1px solid #bae6fd",
                  background: "#f0f9ff",
                  padding: "8px 10px",
                }}
              >
                <div style={{ ...helpTextStyle, marginTop: 0 }}>
                  実際のコメント: {candidate.phrase}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 4 }}>
                  ユーザー意図: {getCandidateIntentValue(candidate)}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 4 }}>
                  トピック判定: {getCandidateTopicDecisionValue(candidate)}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 4 }}>
                  トピック: {candidate.normalizedValue || "(keep の場合は空) "}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {candidate.kind === "utterance_review" ? "utterance review" : candidate.kind}
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>実際のコメント: {candidate.phrase}</div>
              <div
                style={{
                  ...helpTextStyle,
                  display: "none",
                  marginTop: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {candidate.sourceText}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: props.isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <div>
                  <div style={labelStyle}>ユーザー意図</div>
                  <select
                    value={getCandidateIntentValue(candidate)}
                    onChange={(e) =>
                      props.onUpdate(candidate.id, {
                        kind: "utterance_review",
                        intent: e.target.value as UserUtteranceIntent,
                      })
                    }
                    style={selectStyle}
                  >
                    {intentOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatIntentLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>トピック判定</div>
                  <select
                    value={getCandidateTopicDecisionValue(candidate)}
                    onChange={(e) => {
                      const nextDecision = e.target.value as TopicDecision;
                      const originalSuggested =
                        originalSuggestedTopicRef.current[candidate.id] ||
                        candidate.normalizedValue ||
                        "";
                      props.onUpdate(candidate.id, {
                        kind: "utterance_review",
                        topicDecision: nextDecision,
                        normalizedValue:
                          nextDecision === "switch"
                            ? originalSuggested
                            : currentTopic || candidate.normalizedValue || "",
                      });
                    }}
                    style={selectStyle}
                  >
                    {topicDecisionOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatTopicDecisionLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: props.isMobile ? undefined : "1 / -1" }}>
                  <div style={labelStyle}>トピック</div>
                  <input
                    value={resolveCandidateTopicInputValue(candidate)}
                    onChange={(e) =>
                      props.onUpdate(candidate.id, {
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
                  onClick={() => props.onApprove(candidate.id)}
                >
                  確定
                </button>
                <button
                  type="button"
                  style={buttonSecondaryWide}
                  onClick={() => props.onReject(candidate.id)}
                >
                  却下
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SysRuleApprovalSection(props: {
  pendingCount: number;
  approvedCount: number;
  showApproved: boolean;
  onToggleApproved: () => void;
  approvedPhrases: GptPanelProtocolProps["approvedIntentPhrases"];
  pendingCandidates: GptPanelProtocolProps["pendingIntentCandidates"];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <RuleApprovalSection
      sectionTitle="SYSフォーマットルール"
      approvedLabel="承認済"
      pendingLabel="承認待ち"
      approvedCount={props.approvedCount}
      pendingCount={props.pendingCount}
      showApproved={props.showApproved}
      onToggleApproved={props.onToggleApproved}
      approvedEmptyText="承認済みの SYS ルールはありません。"
      pendingEmptyText="未対応の SYS ルール候補はありません。"
      approvedItems={props.approvedPhrases.map((phrase) => ({
        id: phrase.id,
        title: `${phrase.kind} / ${phrase.phrase}`,
        createdAt: phrase.createdAt,
      }))}
      pendingItems={props.pendingCandidates.map((candidate) => ({
        id: candidate.id,
        title: `${candidate.kind} / ${candidate.phrase}`,
        sourceText: candidate.sourceText,
      }))}
      onApprove={props.onApprove}
      onReject={props.onReject}
      onDelete={props.onDelete}
    />
  );
}

function WorkspaceSectionTitle(props: { title: string; subtitle: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: "-0.02em",
        }}
      >
        {props.title}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
        {props.subtitle}
      </div>
    </div>
  );
}

export default function GptSettingsWorkspace({
  activeView,
  settings,
  protocol,
  localSettings,
  setLocalSettings,
  memoryCapacityPreview,
  toPositiveInt,
  isMobile = false,
  onClose,
}: Props) {
  const [showApprovedMemoryRules, setShowApprovedMemoryRules] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("gpt-settings-show-approved-memory") === "1";
  });
  const [showApprovedIntentRules, setShowApprovedIntentRules] = React.useState(true);
  const [sourceDisplayCountInput, setSourceDisplayCountInput] = React.useState(
    String(settings.sourceDisplayCount)
  );

  React.useEffect(() => {
    setSourceDisplayCountInput(String(settings.sourceDisplayCount));
  }, [settings.sourceDisplayCount]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      "gpt-settings-show-approved-memory",
      showApprovedMemoryRules ? "1" : "0"
    );
  }, [showApprovedMemoryRules]);

  const normalizedSearchMode = normalizeStoredSearchMode(settings.searchMode);
  const activeSearchMode: PrimarySearchMode | undefined =
    settings.searchEngines.length > 0
      ? inferPrimarySearchModeFromEngines(settings.searchEngines) ?? undefined
      : isPrimarySearchMode(normalizedSearchMode)
        ? normalizedSearchMode
        : "normal";

  const setSearchPreset = (mode: PrimarySearchMode) => {
    settings.onChangeSearchMode(mode as SearchMode);
    settings.onChangeSearchEngines([...SEARCH_MODE_PRESETS[mode].engines]);
  };

  const toggleSearchEngine = (engine: SearchEngine) => {
    const next = settings.searchEngines.includes(engine)
      ? settings.searchEngines.filter((item) => item !== engine)
      : [...settings.searchEngines, engine];
    settings.onChangeSearchEngines(next);
    const inferred = inferPrimarySearchModeFromEngines(next);
    if (inferred) settings.onChangeSearchMode(inferred as SearchMode);
  };

  const commitSourceDisplayCount = () => {
    const normalized = sourceDisplayCountInput.replace(/[^\d]/g, "").trim();
    const nextValue = Math.max(
      1,
      Math.min(20, Number(normalized || settings.sourceDisplayCount || 1))
    );
    setSourceDisplayCountInput(String(nextValue));
    if (nextValue !== settings.sourceDisplayCount) {
      settings.onChangeSourceDisplayCount(nextValue);
    }
  };

  const handleResetMemorySettings = () => {
    settings.onResetMemorySettings();
    setLocalSettings({
      maxFacts: String(settings.defaultMemorySettings.maxFacts ?? 0),
      maxPreferences: String(settings.defaultMemorySettings.maxPreferences ?? 0),
      chatRecentLimit: String(settings.defaultMemorySettings.chatRecentLimit ?? 0),
      summarizeThreshold: String(
        settings.defaultMemorySettings.summarizeThreshold ?? 0
      ),
      recentKeep: String(settings.defaultMemorySettings.recentKeep ?? 0),
    });
  };

  const handleSaveMemorySettings = () => {
    settings.onSaveMemorySettings({
      maxFacts: toPositiveInt(
        localSettings.maxFacts,
        settings.memorySettings.maxFacts ?? 0
      ),
      maxPreferences: toPositiveInt(
        localSettings.maxPreferences,
        settings.memorySettings.maxPreferences ?? 0
      ),
      chatRecentLimit: toPositiveInt(
        localSettings.chatRecentLimit,
        settings.memorySettings.chatRecentLimit ?? 0
      ),
      summarizeThreshold: toPositiveInt(
        localSettings.summarizeThreshold,
        settings.memorySettings.summarizeThreshold ?? 0
      ),
      recentKeep: toPositiveInt(
        localSettings.recentKeep,
        settings.memorySettings.recentKeep ?? 0
      ),
    });
  };

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        minHeight: 0,
        overflow: "hidden auto",
        overflowY: "auto",
        scrollbarGutter: "stable",
        WebkitOverflowScrolling: "touch",
        padding: isMobile ? "14px 10px 12px 10px" : "18px 16px 16px 16px",
        background:
          "linear-gradient(180deg, rgba(241,245,249,0.94) 0%, rgba(236,253,245,0.9) 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 14,
          width: "min(980px, 100%)",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            ...sectionCard,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            borderRadius: 18,
            padding: isMobile ? 14 : 16,
          }}
        >
          <WorkspaceSectionTitle
            title={
              activeView === "chat"
                ? "チャット設定"
                : activeView === "task"
                  ? "タスク設定"
                  : "ライブラリ設定"
            }
            subtitle={
              activeView === "chat"
                ? "文脈承認、記憶設定、出力モード"
                : activeView === "task"
                  ? "SYSルール、プロトコル自動化、プロンプト"
                  : "ライブラリ、検索、取込"
            }
          />
          <button type="button" style={buttonSecondaryWide} onClick={onClose}>
            閉じる
          </button>
        </div>

        {activeView === "chat" ? (
          <>
            <MemoryApprovalSection
              currentTopic={settings.currentTopic}
              pendingCount={settings.pendingMemoryRuleCandidates.length}
              approvedCount={settings.approvedMemoryRules.length}
              isMobile={isMobile}
              showApproved={showApprovedMemoryRules}
              onToggleApproved={() =>
                setShowApprovedMemoryRules((prev) => !prev)
              }
              approvedRules={settings.approvedMemoryRules}
              pendingCandidates={settings.pendingMemoryRuleCandidates}
              onUpdate={settings.onUpdateMemoryRuleCandidate}
              onApprove={settings.onApproveMemoryRuleCandidate}
              onReject={settings.onRejectMemoryRuleCandidate}
              onDelete={settings.onDeleteApprovedMemoryRule}
            />

            <div style={sectionCard}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <NumberField
                  label="MAX_FACTS"
                  value={localSettings.maxFacts}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, maxFacts: v }))
                  }
                  help="facts の最大数"
                />
                <NumberField
                  label="MAX_PREFERENCES"
                  value={localSettings.maxPreferences}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, maxPreferences: v }))
                  }
                  help="preferences の最大数"
                />
                <NumberField
                  label="CHAT_RECENT_LIMIT"
                  value={localSettings.chatRecentLimit}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, chatRecentLimit: v }))
                  }
                  help="recentMessages の保持数"
                />
                <NumberField
                  label="SUMMARIZE_THRESHOLD"
                  value={localSettings.summarizeThreshold}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      summarizeThreshold: v,
                    }))
                  }
                  help="要約を始める閾値"
                />
                <NumberField
                  label="RECENT_KEEP"
                  value={localSettings.recentKeep}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, recentKeep: v }))
                  }
                  help="要約後に残す recentMessages 数"
                />
                <div>
                  <div style={labelStyle}>メモリ容量プレビュー</div>
                  <div
                    style={{
                      ...inputStyle,
                      display: "flex",
                      alignItems: "center",
                      background: "#f8fafc",
                      fontWeight: 800,
                    }}
                  >
                    合計 {memoryCapacityPreview}
                  </div>
                  <div style={helpTextStyle}>recent + facts + preferences</div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  style={buttonSecondaryWide}
                  onClick={handleResetMemorySettings}
                >
                  リセット
                </button>
                <button
                  type="button"
                  style={buttonPrimary}
                  onClick={handleSaveMemorySettings}
                >
                  保存
                </button>
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>出力モード</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["creative", "strict"] as ResponseMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    style={tabButton(settings.responseMode === mode)}
                    onClick={() => settings.onChangeResponseMode(mode)}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {activeView === "task" ? (
          <>
            <SysRuleApprovalSection
              pendingCount={protocol.pendingIntentCandidates.length}
              approvedCount={protocol.approvedIntentPhrases.length}
              showApproved={showApprovedIntentRules}
              onToggleApproved={() =>
                setShowApprovedIntentRules((prev) => !prev)
              }
              approvedPhrases={protocol.approvedIntentPhrases}
              pendingCandidates={protocol.pendingIntentCandidates}
              onApprove={protocol.onApproveIntentCandidate}
              onReject={protocol.onRejectIntentCandidate}
              onDelete={protocol.onDeleteApprovedIntentPhrase}
            />

            <ProtocolSettingsSection
              autoSendKinSysInput={settings.autoSendKinSysInput}
              autoCopyKinSysResponseToGpt={settings.autoCopyKinSysResponseToGpt}
              autoSendGptSysInput={settings.autoSendGptSysInput}
              autoCopyGptSysResponseToKin={settings.autoCopyGptSysResponseToKin}
              autoCopyFileIngestSysInfoToKin={
                settings.autoCopyFileIngestSysInfoToKin
              }
              protocolPrompt={protocol.protocolPrompt}
              protocolRulebook={protocol.protocolRulebook}
              onChangeAutoSendKinSysInput={settings.onChangeAutoSendKinSysInput}
              onChangeAutoCopyKinSysResponseToGpt={
                settings.onChangeAutoCopyKinSysResponseToGpt
              }
              onChangeAutoSendGptSysInput={settings.onChangeAutoSendGptSysInput}
              onChangeAutoCopyGptSysResponseToKin={
                settings.onChangeAutoCopyGptSysResponseToKin
              }
              onChangeAutoCopyFileIngestSysInfoToKin={
                settings.onChangeAutoCopyFileIngestSysInfoToKin
              }
              onChangeProtocolPrompt={protocol.onChangeProtocolPrompt}
              onChangeProtocolRulebook={protocol.onChangeProtocolRulebook}
              onResetProtocolDefaults={protocol.onResetProtocolDefaults}
              onSaveProtocolDefaults={protocol.onSaveProtocolDefaults}
              onSetProtocolRulebookToKinDraft={
                protocol.onSetProtocolRulebookToKinDraft
              }
              onSendProtocolRulebookToKin={protocol.onSendProtocolRulebookToKin}
            />
          </>
        ) : null}

        {activeView === "library" ? (
          <>
            <LibrarySettingsSection
              isMobile={isMobile}
              autoLibraryReferenceEnabled={settings.autoLibraryReferenceEnabled}
              libraryReferenceMode={settings.libraryReferenceMode}
              libraryIndexResponseCount={settings.libraryIndexResponseCount}
              libraryReferenceCount={settings.libraryReferenceCount}
              libraryStorageMB={settings.libraryStorageMB}
              libraryReferenceEstimatedTokens={
                settings.libraryReferenceEstimatedTokens
              }
              onChangeAutoLibraryReferenceEnabled={
                settings.onChangeAutoLibraryReferenceEnabled
              }
              onChangeLibraryReferenceMode={settings.onChangeLibraryReferenceMode}
              onChangeLibraryIndexResponseCount={
                settings.onChangeLibraryIndexResponseCount
              }
              onChangeLibraryReferenceCount={settings.onChangeLibraryReferenceCount}
            />

            <SearchSettingsSection
              isMobile={isMobile}
              activeSearchMode={activeSearchMode}
              searchLocation={settings.searchLocation}
              searchEngines={settings.searchEngines}
              sourceDisplayCountInput={sourceDisplayCountInput}
              onSetSearchPreset={setSearchPreset}
              onToggleSearchEngine={toggleSearchEngine}
              onChangeSearchLocation={settings.onChangeSearchLocation}
              onChangeSourceDisplayCountInput={setSourceDisplayCountInput}
              onCommitSourceDisplayCount={commitSourceDisplayCount}
            />

            <IngestSettingsSection
              isMobile={isMobile}
              ingestMode={settings.ingestMode}
              onChangeIngestMode={settings.onChangeIngestMode}
              imageDetail={settings.imageDetail}
              onChangeImageDetail={settings.onChangeImageDetail}
              compactCharLimit={settings.compactCharLimit}
              simpleImageCharLimit={settings.simpleImageCharLimit}
              onChangeCompactCharLimit={settings.onChangeCompactCharLimit}
              onChangeSimpleImageCharLimit={settings.onChangeSimpleImageCharLimit}
              fileReadPolicy={settings.fileReadPolicy}
              onChangeFileReadPolicy={settings.onChangeFileReadPolicy}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
