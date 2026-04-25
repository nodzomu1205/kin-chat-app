"use client";

import React from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/task/taskIntent";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memory-domain/memoryInterpreterRules";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";
import { selectStyle, subtleCard } from "./GptSettingsShared";
import {
  formatIntentLabel,
  formatIntentPhraseKindLabel,
  formatMemoryRuleKind,
  formatTopicDecisionLabel,
  getCandidateIntentValue,
  getCandidateTopicDecisionValue,
  GPT_SETTINGS_RULES_TEXT,
} from "./gptSettingsText";
import {
  MEMORY_INTENT_OPTIONS,
  TOPIC_DECISION_OPTIONS,
} from "./GptSettingsApprovalState";

const RULES_TEXT = GPT_SETTINGS_RULES_TEXT;

export function PendingMemoryRuleCandidateCard(props: {
  candidate: PendingMemoryRuleCandidate;
  isMobile?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PendingMemoryRuleCandidate>) => void;
}) {
  const { candidate } = props;

  return (
    <div style={{ ...subtleCard, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800 }}>
        {formatMemoryRuleKind(candidate.kind)}
      </div>
      <div style={{ ...helpTextStyle, marginTop: 6 }}>
        {RULES_TEXT.sourcePhrase}: {candidate.phrase}
      </div>
      <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>
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
          <div style={labelStyle}>{RULES_TEXT.userIntent}</div>
          <select
            value={getCandidateIntentValue(candidate)}
            onChange={(event) =>
              props.onUpdate(candidate.id, {
                kind: "utterance_review",
                intent: event.target.value as UserUtteranceIntent,
              })
            }
            style={selectStyle}
          >
            {MEMORY_INTENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatIntentLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>{RULES_TEXT.topicDecision}</div>
          <select
            value={getCandidateTopicDecisionValue(candidate)}
            onChange={(event) =>
              props.onUpdate(candidate.id, {
                kind: "utterance_review",
                topicDecision: event.target.value as TopicDecision,
              })
            }
            style={selectStyle}
          >
            {TOPIC_DECISION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatTopicDecisionLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: props.isMobile ? undefined : "1 / -1" }}>
          <div style={labelStyle}>{RULES_TEXT.topic}</div>
          <input
            value={candidate.normalizedValue || ""}
            onChange={(event) =>
              props.onUpdate(candidate.id, {
                kind: "utterance_review",
                normalizedValue: event.target.value,
              })
            }
            placeholder={RULES_TEXT.topicPlaceholder}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          style={buttonPrimary}
          onClick={() => props.onApprove(candidate.id)}
        >
          {RULES_TEXT.approve}
        </button>
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={() => props.onReject(candidate.id)}
        >
          {RULES_TEXT.reject}
        </button>
      </div>
    </div>
  );
}

export function ApprovedMemoryRuleCard(props: {
  rule: ApprovedMemoryRule;
  onDelete: (id: string) => void;
}) {
  const { rule } = props;

  return (
    <div style={subtleCard}>
      <div style={{ fontSize: 12, fontWeight: 800 }}>
        {formatMemoryRuleKind(rule.kind)}
      </div>
      <div style={{ ...helpTextStyle, marginTop: 6 }}>
        {RULES_TEXT.sourcePhrase}: {rule.phrase}
      </div>
      {rule.intent ? (
        <div style={{ ...helpTextStyle, marginTop: 6 }}>
          {RULES_TEXT.userIntent}: {formatIntentLabel(rule.intent)}
        </div>
      ) : null}
      {rule.topicDecision ? (
        <div style={{ ...helpTextStyle, marginTop: 6 }}>
          {RULES_TEXT.topicDecision}: {formatTopicDecisionLabel(rule.topicDecision)}
        </div>
      ) : null}
      {rule.normalizedValue ? (
        <div style={{ ...helpTextStyle, marginTop: 6 }}>
          {RULES_TEXT.topic}: {rule.normalizedValue}
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
          {RULES_TEXT.createdAt}: {rule.createdAt.slice(0, 10)}
        </div>
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={() => props.onDelete(rule.id)}
        >
          {RULES_TEXT.delete}
        </button>
      </div>
    </div>
  );
}

export function PendingIntentRuleCard(props: {
  candidate: PendingIntentCandidate;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { candidate } = props;

  return (
    <div style={{ ...subtleCard, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800 }}>
        {formatIntentPhraseKindLabel(candidate.kind)} / {candidate.phrase}
      </div>
      <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>
        {candidate.sourceText}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          style={buttonPrimary}
          onClick={() => props.onApprove(candidate.id)}
        >
          {RULES_TEXT.approve}
        </button>
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={() => props.onReject(candidate.id)}
        >
          {RULES_TEXT.reject}
        </button>
      </div>
    </div>
  );
}

export function ApprovedIntentRuleCard(props: {
  phrase: ApprovedIntentPhrase;
  onDelete: (id: string) => void;
}) {
  const { phrase } = props;

  return (
    <div style={subtleCard}>
      <div style={{ fontSize: 12, fontWeight: 800 }}>
        {formatIntentPhraseKindLabel(phrase.kind)} / {phrase.phrase}
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
          {RULES_TEXT.createdAt}: {phrase.createdAt.slice(0, 10)}
        </div>
        <button
          type="button"
          style={buttonSecondaryWide}
          onClick={() => props.onDelete(phrase.id)}
        >
          {RULES_TEXT.delete}
        </button>
      </div>
    </div>
  );
}
