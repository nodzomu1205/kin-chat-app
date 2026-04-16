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
  tabButton,
} from "@/components/panels/gpt/GptSettingsSections";
import {
  CountBadge,
  ItemActionRow,
  LabeledSelect,
  LabeledTextArea,
  NumberField,
  SectionHeaderRow,
  SettingsItemCard,
  TextField,
} from "@/components/panels/gpt/GptSettingsShared";
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
  onChangeView: (view: SettingsWorkspaceView) => void;
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

function formatIntentPhraseKindLabel(
  kind: GptPanelProtocolProps["pendingIntentCandidates"][number]["kind"]
) {
  switch (kind) {
    case "ask_gpt":
      return "GPT依頼回数";
    case "ask_user":
      return "ユーザー確認回数";
    case "search_request":
      return "検索依頼回数";
    case "youtube_transcript_request":
      return "コンテンツ取得回数";
    case "library_reference":
      return "ライブラリ参照回数";
    case "char_limit":
      return "文字数制約";
    default:
      return kind;
  }
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
        <LabeledSelect
          label="ファイル読み取り方針"
          value={props.fileReadPolicy}
          onChange={(value) =>
            props.onChangeFileReadPolicy(value as FileReadPolicy)
          }
        >
            <option value="text_first">テキスト優先</option>
            <option value="visual_first">見た目優先</option>
            <option value="text_and_layout">両方</option>
        </LabeledSelect>
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
            <LabeledSelect
              label="テキスト取込"
              value={props.ingestMode}
              onChange={(value) => props.onChangeIngestMode(value as IngestMode)}
            >
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label="文字数上限"
                value={String(props.compactCharLimit)}
                onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))}
              />
            </div>
          </div>
          <div style={subtleCard}>
            <LabeledSelect
              label="画像 / PDF 取込"
              value={props.imageDetail}
              onChange={(value) => props.onChangeImageDetail(value as ImageDetail)}
            >
              <option value="simple">simple</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
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
      <SectionHeaderRow
        title={props.sectionTitle}
        badges={
          <>
            <CountBadge label={props.approvedLabel} count={props.approvedCount} tone="info" />
            <CountBadge
              label={props.pendingLabel}
              count={props.pendingCount}
              tone={props.pendingCount > 0 ? "warning" : "neutral"}
            />
          </>
        }
        action={
          <button
          type="button"
          style={tabButton(props.showApproved)}
          onClick={props.onToggleApproved}
        >
          {props.showApproved ? "承認済みを閉じる" : "承認済みを表示"}
          </button>
        }
      />

      {props.showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedItems.length === 0 ? (
            <div style={helpTextStyle}>{props.approvedEmptyText}</div>
          ) : (
            props.approvedItems.map((item) => (
              <SettingsItemCard key={item.id} title={item.title}>
                {item.meta ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>{item.meta}</div>
                ) : null}
                {item.extra ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>{item.extra}</div>
                ) : null}
                <ItemActionRow
                  meta={item.createdAt ? `登録日: ${item.createdAt.slice(0, 10)}` : ""}
                  actions={
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDelete(item.id)}
                  >
                    削除
                  </button>
                  }
                />
              </SettingsItemCard>
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
            <SettingsItemCard key={item.id} title={item.title}>
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
              <ItemActionRow
                meta="左が確定、右が却下です。"
                stacked
                actions={
                  <>
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
                  </>
                }
              />
            </SettingsItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

void RuleApprovalSection;

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
  const originalSuggestedTopics = React.useMemo(() => {
    const next: Record<string, string> = {};
    props.pendingCandidates.forEach((candidate) => {
      if (candidate.kind === "utterance_review") {
        next[candidate.id] = candidate.normalizedValue || "";
      }
    });
    return next;
  }, [props.pendingCandidates]);

  const resolveCandidateTopicInputValue = React.useCallback(
    (candidate: PendingMemoryRuleCandidate) => {
      const decision = getCandidateTopicDecisionValue(candidate);
      const originalSuggested = originalSuggestedTopics[candidate.id] || "";
      const currentValue = candidate.normalizedValue || "";

      if (decision === "switch") return currentValue || originalSuggested;
      if (currentValue && currentValue !== originalSuggested) return currentValue;
      return currentTopic || currentValue;
    },
    [currentTopic, originalSuggestedTopics]
  );

  return (
    <div style={sectionCard}>
      <SectionHeaderRow
        title="文脈レビュー"
        badges={
          <>
            <CountBadge label="承認済み" count={props.approvedCount} tone="info" />
            <CountBadge
              label="承認待ち"
              count={props.pendingCount}
              tone={props.pendingCount > 0 ? "warning" : "neutral"}
            />
          </>
        }
        action={
          <button
          type="button"
          style={tabButton(props.showApproved)}
          onClick={props.onToggleApproved}
        >
          {props.showApproved ? "承認済みを閉じる" : "承認済みを表示"}
          </button>
        }
      />

      {props.showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedRules.length === 0 ? (
            <div style={helpTextStyle}>登録済みの文脈レビューはありません。</div>
          ) : (
            props.approvedRules.map((rule) => (
              <SettingsItemCard
                key={rule.id}
                title={rule.kind === "utterance_review" ? "utterance review" : rule.kind}
              >
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
                <ItemActionRow
                  meta={`登録日: ${rule.createdAt.slice(0, 10)}`}
                  actions={
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDelete(rule.id)}
                  >
                    削除
                  </button>
                  }
                />
              </SettingsItemCard>
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
            <SettingsItemCard
              key={candidate.id}
              title={candidate.kind === "utterance_review" ? "utterance review" : candidate.kind}
            >
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
                  <LabeledSelect
                    label="ユーザー意図"
                    value={getCandidateIntentValue(candidate)}
                    onChange={(value) =>
                      props.onUpdate(candidate.id, {
                        kind: "utterance_review",
                        intent: value as UserUtteranceIntent,
                      })
                    }
                  >
                    {intentOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatIntentLabel(option)}
                      </option>
                    ))}
                  </LabeledSelect>
                </div>
                <div>
                  <LabeledSelect
                    label="トピック判定"
                    value={getCandidateTopicDecisionValue(candidate)}
                    onChange={(value) => {
                      const nextDecision = value as TopicDecision;
                      const originalSuggested =
                        originalSuggestedTopics[candidate.id] || candidate.normalizedValue || "";
                      props.onUpdate(candidate.id, {
                        kind: "utterance_review",
                        topicDecision: nextDecision,
                        normalizedValue:
                          nextDecision === "switch"
                            ? originalSuggested
                            : currentTopic || candidate.normalizedValue || "",
                      });
                    }}
                  >
                    {topicDecisionOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatTopicDecisionLabel(option)}
                      </option>
                    ))}
                  </LabeledSelect>
                </div>
                <div style={{ gridColumn: props.isMobile ? undefined : "1 / -1" }}>
                  <TextField
                    label="トピック"
                    value={resolveCandidateTopicInputValue(candidate)}
                    onChange={(value) =>
                      props.onUpdate(candidate.id, {
                        kind: "utterance_review",
                        normalizedValue: value,
                      })
                    }
                    placeholder="keep の場合は空のまま"
                  />
                </div>
              </div>
              <ItemActionRow
                stacked
                actions={
                  <>
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
                  </>
                }
              />
            </SettingsItemCard>
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
  onUpdate: GptPanelProtocolProps["onUpdateIntentCandidate"];
  onUpdateApproved: GptPanelProtocolProps["onUpdateApprovedIntentPhrase"];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <SectionHeaderRow
        title="SYSフォーマットルール"
        badges={
          <>
            <CountBadge label="承認済み" count={props.approvedCount} tone="info" />
            <CountBadge
              label="承認待ち"
              count={props.pendingCount}
              tone={props.pendingCount > 0 ? "warning" : "neutral"}
            />
          </>
        }
        action={
          <button type="button" style={tabButton(props.showApproved)} onClick={props.onToggleApproved}>
            {props.showApproved ? "承認済みを閉じる" : "承認済みを表示"}
          </button>
        }
      />

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>承認待ち</div>
      {props.pendingCandidates.length === 0 ? (
        <div style={helpTextStyle}>未対応の SYS ルール候補はありません。</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {props.pendingCandidates.map((candidate) => (
            <SettingsItemCard key={candidate.id} title={formatIntentPhraseKindLabel(candidate.kind)}>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                元の検出語: {candidate.phrase}
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>
                {candidate.sourceText}
              </div>
              <div style={{ marginTop: 10 }}>
                <LabeledTextArea
                  label="承認文面"
                  value={candidate.draftText || candidate.phrase}
                  onChange={(value) =>
                    props.onUpdate(candidate.id, {
                      draftText: value,
                    })
                  }
                  minHeight={74}
                />
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                正しければ承認、少しズレていれば修正して承認、方向が違えば却下します。
              </div>
              <ItemActionRow
                stacked
                actions={
                  <>
                    <button type="button" style={buttonPrimary} onClick={() => props.onApprove(candidate.id)}>
                      承認
                    </button>
                    <button type="button" style={buttonSecondaryWide} onClick={() => props.onReject(candidate.id)}>
                      却下
                    </button>
                  </>
                }
              />
            </SettingsItemCard>
          ))}
        </div>
      )}

      {props.showApproved ? (
        <>
          <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>承認済み</div>
          <div style={{ display: "grid", gap: 8 }}>
            {props.approvedPhrases.map((phrase) => (
              <SettingsItemCard key={phrase.id} title={formatIntentPhraseKindLabel(phrase.kind)}>
                <div style={{ ...helpTextStyle, marginTop: 6 }}>
                  元の検出語: {phrase.phrase}
                </div>
                <div style={{ marginTop: 10 }}>
                  <LabeledTextArea
                    label="承認文面"
                    value={phrase.draftText || phrase.phrase}
                    onChange={(value) =>
                      props.onUpdateApproved(phrase.id, {
                        draftText: value,
                      })
                    }
                    minHeight={64}
                  />
                </div>
                <div style={{ ...helpTextStyle, marginTop: 6 }}>
                  承認回数: {phrase.approvedCount ?? 0} / 却下回数: {phrase.rejectedCount ?? 0}
                </div>
                <ItemActionRow
                  meta={`作成日: ${phrase.createdAt.slice(0, 10)}`}
                  actions={
                  <button type="button" style={buttonSecondaryWide} onClick={() => props.onDelete(phrase.id)}>
                    削除
                  </button>
                  }
                />
              </SettingsItemCard>
            ))}
          </div>
        </>
      ) : null}
    </div>
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
  onChangeView,
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
  const [showApprovedIntentRules, setShowApprovedIntentRules] = React.useState(false);
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: isMobile ? "flex-start" : "flex-end",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["chat", "task", "library"] as SettingsWorkspaceView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  style={tabButton(activeView === view)}
                  onClick={() => onChangeView(view)}
                >
                  {view === "chat"
                    ? "チャット"
                    : view === "task"
                      ? "タスク"
                      : "ライブラリ"}
                </button>
              ))}
            </div>
            <button type="button" style={buttonSecondaryWide} onClick={onClose}>
              閉じる
            </button>
          </div>
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
              onUpdate={protocol.onUpdateIntentCandidate}
              onUpdateApproved={protocol.onUpdateApprovedIntentPhrase}
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
