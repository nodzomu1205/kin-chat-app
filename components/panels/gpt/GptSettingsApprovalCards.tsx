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
} from "@/components/panels/gpt/gptPanelStyles";
import {
  formatIntentLabel,
  formatTopicDecisionLabel,
  getCandidateIntentValue,
  getCandidateTopicDecisionValue,
  GPT_SETTINGS_REVIEW_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import {
  buildTopicDecisionPatch,
  MEMORY_INTENT_OPTIONS,
  TOPIC_DECISION_OPTIONS,
} from "@/components/panels/gpt/GptSettingsApprovalState";
import {
  ItemActionRow,
  LabeledSelect,
  LabeledTextArea,
  SettingsItemCard,
  TextField,
} from "@/components/panels/gpt/GptSettingsShared";
import type {
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memory-domain/memoryInterpreterRules";

const REVIEW_TEXT = GPT_SETTINGS_REVIEW_TEXT;

export function ApprovedMemoryRuleCard(props: {
  rule: GptPanelSettingsProps["approvedMemoryRules"][number];
  onDelete: (id: string) => void;
}) {
  const { rule } = props;

  return (
    <SettingsItemCard
      title={rule.kind === "utterance_review" ? "utterance review" : rule.kind}
    >
      <div style={{ ...helpTextStyle, marginTop: 6 }}>
        {REVIEW_TEXT.sourcePhrase}: {rule.phrase}
      </div>
      {rule.intent ? (
        <div style={{ ...helpTextStyle, marginTop: 6 }}>
          {REVIEW_TEXT.intent}: {rule.intent}
        </div>
      ) : null}
      {rule.topicDecision ? (
        <div style={{ ...helpTextStyle, marginTop: 6 }}>
          {REVIEW_TEXT.topicDecision}: {rule.topicDecision}
        </div>
      ) : null}
      {rule.normalizedValue ? (
        <div style={{ ...helpTextStyle, marginTop: 6 }}>
          {REVIEW_TEXT.topicCandidate}: {rule.normalizedValue}
        </div>
      ) : null}
      <ItemActionRow
        meta={`${REVIEW_TEXT.createdAt}: ${rule.createdAt.slice(0, 10)}`}
        actions={
          <button
            type="button"
            style={buttonSecondaryWide}
            onClick={() => props.onDelete(rule.id)}
          >
            {REVIEW_TEXT.delete}
          </button>
        }
      />
    </SettingsItemCard>
  );
}

export function PendingMemoryCandidateCard(props: {
  candidate: PendingMemoryRuleCandidate;
  currentTopic: string;
  isMobile?: boolean;
  originalSuggestedTopic: string;
  topicInputValue: string;
  onUpdate: (id: string, patch: Partial<PendingMemoryRuleCandidate>) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { candidate } = props;

  return (
    <SettingsItemCard
      title={
        candidate.kind === "utterance_review"
          ? "utterance review"
          : candidate.kind
      }
    >
      <div style={{ ...helpTextStyle, marginTop: 6 }}>
        {REVIEW_TEXT.actualComment}: {candidate.phrase}
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
            label={REVIEW_TEXT.userIntent}
            value={getCandidateIntentValue(candidate)}
            onChange={(value) =>
              props.onUpdate(candidate.id, {
                kind: "utterance_review",
                intent: value as UserUtteranceIntent,
              })
            }
          >
            {MEMORY_INTENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatIntentLabel(option)}
              </option>
            ))}
          </LabeledSelect>
        </div>
        <div>
          <LabeledSelect
            label={REVIEW_TEXT.topicDecision}
            value={getCandidateTopicDecisionValue(candidate)}
            onChange={(value) => {
              props.onUpdate(
                candidate.id,
                buildTopicDecisionPatch({
                  candidate,
                  nextDecision: value as TopicDecision,
                  currentTopic: props.currentTopic,
                  originalSuggestedTopic: props.originalSuggestedTopic,
                })
              );
            }}
          >
            {TOPIC_DECISION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatTopicDecisionLabel(option)}
              </option>
            ))}
          </LabeledSelect>
        </div>
        <div style={{ gridColumn: props.isMobile ? undefined : "1 / -1" }}>
          <TextField
            label={REVIEW_TEXT.topic}
            value={props.topicInputValue}
            onChange={(value) =>
              props.onUpdate(candidate.id, {
                kind: "utterance_review",
                normalizedValue: value,
              })
            }
            placeholder={REVIEW_TEXT.keepPlaceholder}
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
              {REVIEW_TEXT.confirm}
            </button>
            <button
              type="button"
              style={buttonSecondaryWide}
              onClick={() => props.onReject(candidate.id)}
            >
              {REVIEW_TEXT.reject}
            </button>
          </>
        }
      />
    </SettingsItemCard>
  );
}

export function PendingSysRuleCandidateCard(props: {
  candidate: GptPanelProtocolProps["pendingIntentCandidates"][number];
  onUpdate: GptPanelProtocolProps["onUpdateIntentCandidate"];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { candidate } = props;

  return (
    <SettingsItemCard title={REVIEW_TEXT.approvedDraft}>
      <div style={{ ...helpTextStyle, marginTop: 6 }}>
        {REVIEW_TEXT.detectedPhrase}: {candidate.phrase}
      </div>
      <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>
        {candidate.sourceText}
      </div>
      <div style={{ marginTop: 10 }}>
        <LabeledTextArea
          label={REVIEW_TEXT.approvedDraft}
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
        {REVIEW_TEXT.approvalHelp}
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
              {REVIEW_TEXT.approve}
            </button>
            <button
              type="button"
              style={buttonSecondaryWide}
              onClick={() => props.onReject(candidate.id)}
            >
              {REVIEW_TEXT.reject}
            </button>
          </>
        }
      />
    </SettingsItemCard>
  );
}

export function ApprovedSysRulePhraseCard(props: {
  phrase: GptPanelProtocolProps["approvedIntentPhrases"][number];
  onUpdateApproved: GptPanelProtocolProps["onUpdateApprovedIntentPhrase"];
  onDelete: (id: string) => void;
}) {
  const { phrase } = props;

  return (
    <SettingsItemCard title={REVIEW_TEXT.approvedDraft}>
      <div style={{ ...helpTextStyle, marginTop: 6 }}>
        {REVIEW_TEXT.detectedPhrase}: {phrase.phrase}
      </div>
      <div style={{ marginTop: 10 }}>
        <LabeledTextArea
          label={REVIEW_TEXT.approvedDraft}
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
        {REVIEW_TEXT.approvalCount}: {phrase.approvedCount ?? 0} /{" "}
        {REVIEW_TEXT.rejectionCount}: {phrase.rejectedCount ?? 0}
      </div>
      <ItemActionRow
        meta={`${REVIEW_TEXT.createdAt}: ${phrase.createdAt.slice(0, 10)}`}
        actions={
          <button
            type="button"
            style={buttonSecondaryWide}
            onClick={() => props.onDelete(phrase.id)}
          >
            {REVIEW_TEXT.delete}
          </button>
        }
      />
    </SettingsItemCard>
  );
}
