"use client";

import React from "react";
import type {
  GptPanelProtocolProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  labelStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import { sectionCard, tabButton } from "@/components/panels/gpt/GptSettingsSections";
import {
  formatIntentLabel,
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
  SectionHeaderRow,
  SettingsItemCard,
  TextField,
} from "@/components/panels/gpt/GptSettingsShared";
import type {
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memory-domain/memoryInterpreterRules";

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

export function RuleApprovalSection(props: {
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
            <CountBadge
              label={props.approvedLabel}
              count={props.approvedCount}
              tone="info"
            />
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
            {props.showApproved
              ? WORKSPACE_REVIEW_TEXT.hideApproved
              : WORKSPACE_REVIEW_TEXT.showApproved}
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

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>
        {WORKSPACE_REVIEW_TEXT.pending}
      </div>
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

export function MemoryApprovalSection(props: {
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
            <CountBadge
              label={WORKSPACE_REVIEW_TEXT.approved}
              count={props.approvedCount}
              tone="info"
            />
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
            {props.showApproved
              ? WORKSPACE_REVIEW_TEXT.hideApproved
              : WORKSPACE_REVIEW_TEXT.showApproved}
          </button>
        }
      />

      {props.showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedRules.length === 0 ? (
            <div style={helpTextStyle}>
              {WORKSPACE_REVIEW_TEXT.noApprovedMemoryReview}
            </div>
          ) : (
            props.approvedRules.map((rule) => (
              <SettingsItemCard
                key={rule.id}
                title={rule.kind === "utterance_review" ? "utterance review" : rule.kind}
              >
                <div style={{ ...helpTextStyle, marginTop: 6 }}>
                  {WORKSPACE_REVIEW_TEXT.sourcePhrase}: {rule.phrase}
                </div>
                {rule.intent ? (
                  <div style={{ ...helpTextStyle, marginTop: 6 }}>
                    {WORKSPACE_REVIEW_TEXT.intent}: {rule.intent}
                  </div>
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

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>
        {WORKSPACE_REVIEW_TEXT.pending}
      </div>
      {props.pendingCandidates.length === 0 ? (
        <div style={helpTextStyle}>
          {WORKSPACE_REVIEW_TEXT.noPendingMemoryReview}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {props.pendingCandidates.map((candidate) => (
            <SettingsItemCard
              key={candidate.id}
              title={
                candidate.kind === "utterance_review"
                  ? "utterance review"
                  : candidate.kind
              }
            >
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                {WORKSPACE_REVIEW_TEXT.actualComment}: {candidate.phrase}
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
                        originalSuggestedTopics[candidate.id] ||
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

export function SysRuleApprovalSection(props: {
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
            <CountBadge
              label={WORKSPACE_REVIEW_TEXT.approved}
              count={props.approvedCount}
              tone="info"
            />
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
            {props.showApproved
              ? WORKSPACE_REVIEW_TEXT.hideApproved
              : WORKSPACE_REVIEW_TEXT.showApproved}
          </button>
        }
      />

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>
        {WORKSPACE_REVIEW_TEXT.pending}
      </div>
      {props.pendingCandidates.length === 0 ? (
        <div style={helpTextStyle}>{WORKSPACE_REVIEW_TEXT.noPendingSysRules}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {props.pendingCandidates.map((candidate) => (
            <SettingsItemCard
              key={candidate.id}
              title={WORKSPACE_REVIEW_TEXT.approvedDraft}
            >
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                {WORKSPACE_REVIEW_TEXT.detectedPhrase}: {candidate.phrase}
              </div>
              <div
                style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}
              >
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
                    <button
                      type="button"
                      style={buttonPrimary}
                      onClick={() => props.onApprove(candidate.id)}
                    >
                      {WORKSPACE_REVIEW_TEXT.approve}
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

      {props.showApproved ? (
        <>
          <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>
            {WORKSPACE_REVIEW_TEXT.approvedSection}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {props.approvedPhrases.map((phrase) => (
              <SettingsItemCard
                key={phrase.id}
                title={WORKSPACE_REVIEW_TEXT.approvedDraft}
              >
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
                  {WORKSPACE_REVIEW_TEXT.approvalCount}: {phrase.approvedCount ?? 0} /{" "}
                  {WORKSPACE_REVIEW_TEXT.rejectionCount}: {phrase.rejectedCount ?? 0}
                </div>
                <ItemActionRow
                  meta={`${WORKSPACE_REVIEW_TEXT.createdAt}: ${phrase.createdAt.slice(0, 10)}`}
                  actions={
                    <button
                      type="button"
                      style={buttonSecondaryWide}
                      onClick={() => props.onDelete(phrase.id)}
                    >
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
