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
  GPT_SETTINGS_DRAWER_TEXT,
  GPT_SETTINGS_WORKSPACE_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_INGEST_SETTINGS_TEXT } from "@/components/panels/gpt/gptIngestSettingsText";
import {
  formatIntentLabel,
  formatIntentPhraseKindLabel,
  formatTopicDecisionLabel,
  getCandidateIntentValue,
  getCandidateTopicDecisionValue,
  GPT_SETTINGS_REVIEW_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import {
  CountBadge,
  ItemActionRow,
  LabeledSelect,
  LabeledTextArea,
  NumberField,
  ReadonlyStatField,
  SectionHeaderRow,
  SettingsItemCard,
  TextField,
  ToggleButtons,
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

const WORKSPACE_REVIEW_TEXT = GPT_SETTINGS_REVIEW_TEXT;

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
  driveImportAutoSummary: boolean;
  onChangeDriveImportAutoSummary: (value: boolean) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <LabeledSelect
          label={GPT_SETTINGS_DRAWER_TEXT.fileReadPolicy}
          value={props.fileReadPolicy}
          onChange={(value) =>
            props.onChangeFileReadPolicy(value as FileReadPolicy)
          }
        >
            <option value="text_first">{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_first}</option>
            <option value="visual_first">{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.visual_first}</option>
            <option value="text_and_layout">{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_and_layout}</option>
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
              label={GPT_SETTINGS_DRAWER_TEXT.textIngest}
              value={props.ingestMode}
              onChange={(value) => props.onChangeIngestMode(value as IngestMode)}
            >
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                value={String(props.compactCharLimit)}
                onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))}
              />
            </div>
          </div>
          <div style={subtleCard}>
            <LabeledSelect
              label={GPT_SETTINGS_DRAWER_TEXT.imagePdfIngest}
              value={props.imageDetail}
              onChange={(value) => props.onChangeImageDetail(value as ImageDetail)}
            >
              <option value="simple">simple</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                value={String(props.simpleImageCharLimit)}
                onChange={(v) =>
                  props.onChangeSimpleImageCharLimit(Number(v || 0))
                }
              />
            </div>
          </div>
        </div>
        <ToggleButtons
          label={GPT_INGEST_SETTINGS_TEXT.autoSummaryLabel}
          checked={props.driveImportAutoSummary}
          onChange={props.onChangeDriveImportAutoSummary}
        />
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
          {props.showApproved ? WORKSPACE_REVIEW_TEXT.hideApproved : WORKSPACE_REVIEW_TEXT.showApproved}
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
                  meta={
                    item.createdAt
                      ? `${WORKSPACE_REVIEW_TEXT.createdAt}: ${item.createdAt.slice(0, 10)}`
                      : ""
                  }
                  actions={
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDelete(item.id)}
                  >
                    {WORKSPACE_REVIEW_TEXT.delete}
                  </button>
                  }
                />
              </SettingsItemCard>
            ))
          )}
        </div>
      ) : null}

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>{WORKSPACE_REVIEW_TEXT.pending}</div>
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
                meta={WORKSPACE_REVIEW_TEXT.pendingMeta}
                stacked
                actions={
                  <>
                    <button
                      type="button"
                      style={buttonPrimary}
                      onClick={() => props.onApprove(item.id)}
                    >
                      {WORKSPACE_REVIEW_TEXT.approve}
                    </button>
                    <button
                      type="button"
                      style={buttonSecondaryWide}
                      onClick={() => props.onReject(item.id)}
                    >
                      {WORKSPACE_REVIEW_TEXT.reject}
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
        title={WORKSPACE_REVIEW_TEXT.memoryReviewTitle}
        badges={
          <>
            <CountBadge label={WORKSPACE_REVIEW_TEXT.approved} count={props.approvedCount} tone="info" />
            <CountBadge
              label={WORKSPACE_REVIEW_TEXT.pending}
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
          {props.showApproved ? WORKSPACE_REVIEW_TEXT.hideApproved : WORKSPACE_REVIEW_TEXT.showApproved}
          </button>
        }
      />

      {props.showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedRules.length === 0 ? (
            <div style={helpTextStyle}>{WORKSPACE_REVIEW_TEXT.noApprovedMemoryReview}</div>
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
                    {WORKSPACE_REVIEW_TEXT.actualComment}: {rule.phrase}
                  </div>
                  {rule.intent ? (
                    <div style={{ ...helpTextStyle, marginTop: 4 }}>
                      {WORKSPACE_REVIEW_TEXT.userIntent}: {rule.intent}
                    </div>
                  ) : null}
                  {rule.topicDecision ? (
                    <div style={{ ...helpTextStyle, marginTop: 4 }}>
                      {WORKSPACE_REVIEW_TEXT.topicDecision}: {rule.topicDecision}
                    </div>
                  ) : null}
                  {rule.normalizedValue ? (
                    <div style={{ ...helpTextStyle, marginTop: 4 }}>
                      {WORKSPACE_REVIEW_TEXT.topic}: {rule.normalizedValue}
                    </div>
                  ) : null}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 6 }}>{WORKSPACE_REVIEW_TEXT.sourcePhrase}: {rule.phrase}</div>
                {rule.intent ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>{WORKSPACE_REVIEW_TEXT.intent}: {rule.intent}</div>
                ) : null}
                {rule.topicDecision ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>
                    {WORKSPACE_REVIEW_TEXT.topicDecision}: {rule.topicDecision}
                  </div>
                ) : null}
                {rule.normalizedValue ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>
                    {WORKSPACE_REVIEW_TEXT.topicCandidate}: {rule.normalizedValue}
                  </div>
                ) : null}
                <ItemActionRow
                  meta={`${WORKSPACE_REVIEW_TEXT.createdAt}: ${rule.createdAt.slice(0, 10)}`}
                  actions={
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => props.onDelete(rule.id)}
                  >
                    {WORKSPACE_REVIEW_TEXT.delete}
                  </button>
                  }
                />
              </SettingsItemCard>
            ))
          )}
        </div>
      ) : null}

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>{WORKSPACE_REVIEW_TEXT.pending}</div>
      {props.pendingCandidates.length === 0 ? (
        <div style={helpTextStyle}>{WORKSPACE_REVIEW_TEXT.noPendingMemoryReview}</div>
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
                  {WORKSPACE_REVIEW_TEXT.actualComment}: {candidate.phrase}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 4 }}>
                  {WORKSPACE_REVIEW_TEXT.userIntent}: {getCandidateIntentValue(candidate)}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 4 }}>
                  {WORKSPACE_REVIEW_TEXT.topicDecision}: {getCandidateTopicDecisionValue(candidate)}
                </div>
                <div style={{ ...helpTextStyle, marginTop: 4 }}>
                  {WORKSPACE_REVIEW_TEXT.topic}: {candidate.normalizedValue || WORKSPACE_REVIEW_TEXT.keepEmpty}
                </div>
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>{WORKSPACE_REVIEW_TEXT.actualComment}: {candidate.phrase}</div>
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
                    label={WORKSPACE_REVIEW_TEXT.userIntent}
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
                    label={WORKSPACE_REVIEW_TEXT.topicDecision}
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
                    label={WORKSPACE_REVIEW_TEXT.topic}
                    value={resolveCandidateTopicInputValue(candidate)}
                    onChange={(value) =>
                      props.onUpdate(candidate.id, {
                        kind: "utterance_review",
                        normalizedValue: value,
                      })
                    }
                    placeholder={WORKSPACE_REVIEW_TEXT.keepPlaceholder}
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
                      {WORKSPACE_REVIEW_TEXT.confirm}
                    </button>
                    <button
                      type="button"
                      style={buttonSecondaryWide}
                      onClick={() => props.onReject(candidate.id)}
                    >
                      {WORKSPACE_REVIEW_TEXT.reject}
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
        title={WORKSPACE_REVIEW_TEXT.sysRuleTitle}
        badges={
          <>
            <CountBadge label={WORKSPACE_REVIEW_TEXT.approved} count={props.approvedCount} tone="info" />
            <CountBadge
              label={WORKSPACE_REVIEW_TEXT.pending}
              count={props.pendingCount}
              tone={props.pendingCount > 0 ? "warning" : "neutral"}
            />
          </>
        }
        action={
          <button type="button" style={tabButton(props.showApproved)} onClick={props.onToggleApproved}>
            {props.showApproved ? WORKSPACE_REVIEW_TEXT.hideApproved : WORKSPACE_REVIEW_TEXT.showApproved}
          </button>
        }
      />

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>{WORKSPACE_REVIEW_TEXT.pending}</div>
      {props.pendingCandidates.length === 0 ? (
        <div style={helpTextStyle}>{WORKSPACE_REVIEW_TEXT.noPendingSysRules}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {props.pendingCandidates.map((candidate) => (
            <SettingsItemCard key={candidate.id} title={formatIntentPhraseKindLabel(candidate.kind)}>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                {WORKSPACE_REVIEW_TEXT.detectedPhrase}: {candidate.phrase}
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>
                {candidate.sourceText}
              </div>
              <div style={{ marginTop: 10 }}>
                <LabeledTextArea
                  label={WORKSPACE_REVIEW_TEXT.approvedDraft}
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
                {WORKSPACE_REVIEW_TEXT.approvalHelp}
              </div>
              <ItemActionRow
                stacked
                actions={
                  <>
                    <button type="button" style={buttonPrimary} onClick={() => props.onApprove(candidate.id)}>
                      {WORKSPACE_REVIEW_TEXT.approve}
                    </button>
                    <button type="button" style={buttonSecondaryWide} onClick={() => props.onReject(candidate.id)}>
                      {WORKSPACE_REVIEW_TEXT.reject}
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
          <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>{WORKSPACE_REVIEW_TEXT.approvedSection}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {props.approvedPhrases.map((phrase) => (
              <SettingsItemCard key={phrase.id} title={formatIntentPhraseKindLabel(phrase.kind)}>
                <div style={{ ...helpTextStyle, marginTop: 6 }}>
                  {WORKSPACE_REVIEW_TEXT.detectedPhrase}: {phrase.phrase}
                </div>
                <div style={{ marginTop: 10 }}>
                  <LabeledTextArea
                    label={WORKSPACE_REVIEW_TEXT.approvedDraft}
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
                  {WORKSPACE_REVIEW_TEXT.approvalCount}: {phrase.approvedCount ?? 0} / {WORKSPACE_REVIEW_TEXT.rejectionCount}: {phrase.rejectedCount ?? 0}
                </div>
                <ItemActionRow
                  meta={`${WORKSPACE_REVIEW_TEXT.createdAt}: ${phrase.createdAt.slice(0, 10)}`}
                  actions={
                  <button type="button" style={buttonSecondaryWide} onClick={() => props.onDelete(phrase.id)}>
                    {WORKSPACE_REVIEW_TEXT.delete}
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

function GoogleDriveLibrarySection(props: {
  folderLink: string;
  folderId: string;
  integrationMode: "manual_link" | "picker";
  onChangeFolderLink: (value: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>
            {GPT_GOOGLE_DRIVE_TEXT.settings.title}
          </div>
          <div style={helpTextStyle}>
            {GPT_GOOGLE_DRIVE_TEXT.settings.importHelp}
          </div>
        </div>

        <TextField
          label={GPT_GOOGLE_DRIVE_TEXT.settings.folderLinkLabel}
          value={props.folderLink}
          onChange={props.onChangeFolderLink}
          help={GPT_GOOGLE_DRIVE_TEXT.settings.folderLinkHelp}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <ReadonlyStatField
            label={GPT_GOOGLE_DRIVE_TEXT.settings.folderIdLabel}
            value={props.folderId || "-"}
          />
          <ReadonlyStatField
            label={GPT_GOOGLE_DRIVE_TEXT.settings.integrationModeLabel}
            value={
              props.integrationMode === "manual_link"
                ? GPT_GOOGLE_DRIVE_TEXT.settings.integrationModeManual
                : GPT_GOOGLE_DRIVE_TEXT.settings.integrationModePicker
            }
          />
        </div>
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
            title={GPT_SETTINGS_WORKSPACE_TEXT.viewTitles[activeView]}
            subtitle={GPT_SETTINGS_WORKSPACE_TEXT.viewSubtitles[activeView]}
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
                  {GPT_SETTINGS_WORKSPACE_TEXT.viewTabs[view]}
                </button>
              ))}
            </div>
            <button type="button" style={buttonSecondaryWide} onClick={onClose}>
              {GPT_SETTINGS_WORKSPACE_TEXT.close}
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
                  help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxFacts}
                />
                <NumberField
                  label="MAX_PREFERENCES"
                  value={localSettings.maxPreferences}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, maxPreferences: v }))
                  }
                  help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxPreferences}
                />
                <NumberField
                  label="CHAT_RECENT_LIMIT"
                  value={localSettings.chatRecentLimit}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, chatRecentLimit: v }))
                  }
                  help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.chatRecentLimit}
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
                  help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.summarizeThreshold}
                />
                <NumberField
                  label="RECENT_KEEP"
                  value={localSettings.recentKeep}
                  onChange={(v) =>
                    setLocalSettings((prev) => ({ ...prev, recentKeep: v }))
                  }
                  help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.recentKeep}
                />
                <div>
                  <div style={labelStyle}>
                    {GPT_SETTINGS_WORKSPACE_TEXT.memoryCapacityPreviewLabel}
                  </div>
                  <div
                    style={{
                      ...inputStyle,
                      display: "flex",
                      alignItems: "center",
                      background: "#f8fafc",
                      fontWeight: 800,
                    }}
                  >
                    {GPT_SETTINGS_WORKSPACE_TEXT.memoryCapacityPreviewPrefix}
                    {memoryCapacityPreview}
                  </div>
                  <div style={helpTextStyle}>
                    {GPT_SETTINGS_WORKSPACE_TEXT.memoryCapacityPreviewHelp}
                  </div>
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
                  {GPT_SETTINGS_WORKSPACE_TEXT.reset}
                </button>
                <button
                  type="button"
                  style={buttonPrimary}
                  onClick={handleSaveMemorySettings}
                >
                  {GPT_SETTINGS_WORKSPACE_TEXT.save}
                </button>
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>
                {GPT_SETTINGS_WORKSPACE_TEXT.outputMode}
              </div>
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
              driveImportAutoSummary={settings.driveImportAutoSummary}
              onChangeDriveImportAutoSummary={
                settings.onChangeDriveImportAutoSummary
              }
            />

            <GoogleDriveLibrarySection
              folderLink={settings.googleDriveFolderLink}
              folderId={settings.googleDriveFolderId}
              integrationMode={settings.googleDriveIntegrationMode}
              onChangeFolderLink={settings.onChangeGoogleDriveFolderLink}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
