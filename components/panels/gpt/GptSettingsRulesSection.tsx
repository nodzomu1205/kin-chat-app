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
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";
import {
  sectionCard,
  selectStyle,
  subtleCard,
  tabButton,
  ToggleButtons,
} from "./GptSettingsShared";
import {
  formatIntentLabel,
  formatIntentPhraseKindLabel,
  formatMemoryRuleKind,
  formatTopicDecisionLabel,
  getCandidateIntentValue,
  getCandidateTopicDecisionValue,
  GPT_SETTINGS_RULES_TEXT,
} from "./gptSettingsText";

const RULES_TEXT = GPT_SETTINGS_RULES_TEXT;

function MemoryInterpreterSection(props: {
  memoryInterpreterSettings: MemoryInterpreterSettings;
  onChangeMemoryInterpreterSettings: (
    patch: Partial<MemoryInterpreterSettings>
  ) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>
        {RULES_TEXT.interpreterTitle}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <ToggleButtons
          label={RULES_TEXT.llmFallback}
          checked={props.memoryInterpreterSettings.llmFallbackEnabled}
          onChange={(value) =>
            props.onChangeMemoryInterpreterSettings({
              llmFallbackEnabled: value,
            })
          }
          help={RULES_TEXT.llmFallbackHelp}
        />
        <ToggleButtons
          label={RULES_TEXT.saveCandidates}
          checked={props.memoryInterpreterSettings.saveRuleCandidates}
          onChange={(value) =>
            props.onChangeMemoryInterpreterSettings({
              saveRuleCandidates: value,
            })
          }
          help={RULES_TEXT.saveCandidatesHelp}
        />
      </div>
    </div>
  );
}

function PendingMemoryRuleCandidatesSection(props: {
  pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
  isMobile?: boolean;
  onApproveMemoryRuleCandidate: (id: string) => void;
  onRejectMemoryRuleCandidate: (id: string) => void;
  onUpdateMemoryRuleCandidate: (
    id: string,
    patch: Partial<PendingMemoryRuleCandidate>
  ) => void;
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
    <div style={sectionCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>
        {RULES_TEXT.pendingMemoryTitle}
      </div>
      <div style={{ ...helpTextStyle, marginBottom: 8 }}>
        {RULES_TEXT.pendingMemoryHelp}
      </div>
      {props.pendingMemoryRuleCandidates.length === 0 ? (
        <div style={helpTextStyle}>{RULES_TEXT.pendingMemoryEmpty}</div>
      ) : (
        props.pendingMemoryRuleCandidates.map((candidate) => (
          <div key={candidate.id} style={{ ...subtleCard, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {formatMemoryRuleKind(candidate.kind)}
            </div>
            <div style={{ ...helpTextStyle, marginTop: 6 }}>
              {RULES_TEXT.sourcePhrase}: {candidate.phrase}
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
                <div style={labelStyle}>{RULES_TEXT.userIntent}</div>
                <select
                  value={getCandidateIntentValue(candidate)}
                  onChange={(event) =>
                    props.onUpdateMemoryRuleCandidate(candidate.id, {
                      kind: "utterance_review",
                      intent: event.target.value as UserUtteranceIntent,
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
                <div style={labelStyle}>{RULES_TEXT.topicDecision}</div>
                <select
                  value={getCandidateTopicDecisionValue(candidate)}
                  onChange={(event) =>
                    props.onUpdateMemoryRuleCandidate(candidate.id, {
                      kind: "utterance_review",
                      topicDecision: event.target.value as TopicDecision,
                    })
                  }
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
                <div style={labelStyle}>{RULES_TEXT.topic}</div>
                <input
                  value={candidate.normalizedValue || ""}
                  onChange={(event) =>
                    props.onUpdateMemoryRuleCandidate(candidate.id, {
                      kind: "utterance_review",
                      normalizedValue: event.target.value,
                    })
                  }
                  placeholder={RULES_TEXT.topicPlaceholder}
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
                {RULES_TEXT.approve}
              </button>
              <button
                type="button"
                style={buttonSecondaryWide}
                onClick={() => props.onRejectMemoryRuleCandidate(candidate.id)}
              >
                {RULES_TEXT.reject}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ApprovedMemoryRulesSection(props: {
  approvedMemoryRules: ApprovedMemoryRule[];
  showApprovedMemoryRules: boolean;
  onToggleApprovedMemoryRules: () => void;
  onDeleteApprovedMemoryRule: (id: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ ...helpTextStyle, marginBottom: 8 }}>
        {RULES_TEXT.approvedMemoryHelp}
      </div>
      <button
        type="button"
        style={tabButton(props.showApprovedMemoryRules)}
        onClick={props.onToggleApprovedMemoryRules}
      >
        {props.showApprovedMemoryRules
          ? RULES_TEXT.hideApprovedMemory
          : `${RULES_TEXT.showApprovedMemory} (${props.approvedMemoryRules.length})`}
      </button>
      {props.showApprovedMemoryRules ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedMemoryRules.map((rule) => (
            <div key={rule.id} style={subtleCard}>
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
                  onClick={() => props.onDeleteApprovedMemoryRule(rule.id)}
                >
                  {RULES_TEXT.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PendingIntentRulesSection(props: {
  pendingIntentCandidates: PendingIntentCandidate[];
  onApproveIntentCandidate: (id: string) => void;
  onRejectIntentCandidate: (id: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>
        {RULES_TEXT.pendingSysTitle}
      </div>
      <div style={{ ...helpTextStyle, marginBottom: 8 }}>
        {RULES_TEXT.pendingSysHelp}
      </div>
      {props.pendingIntentCandidates.length === 0 ? (
        <div style={helpTextStyle}>{RULES_TEXT.pendingSysEmpty}</div>
      ) : (
        props.pendingIntentCandidates.map((candidate) => (
          <div key={candidate.id} style={{ ...subtleCard, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {formatIntentPhraseKindLabel(candidate.kind)} / {candidate.phrase}
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
                {RULES_TEXT.approve}
              </button>
              <button
                type="button"
                style={buttonSecondaryWide}
                onClick={() => props.onRejectIntentCandidate(candidate.id)}
              >
                {RULES_TEXT.reject}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ApprovedIntentRulesSection(props: {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  showApprovedIntentRules: boolean;
  onToggleApprovedIntentRules: () => void;
  onDeleteApprovedIntentPhrase: (id: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <button
        type="button"
        style={tabButton(props.showApprovedIntentRules)}
        onClick={props.onToggleApprovedIntentRules}
      >
        {props.showApprovedIntentRules
          ? RULES_TEXT.hideApprovedSys
          : `${RULES_TEXT.showApprovedSys} (${props.approvedIntentPhrases.length})`}
      </button>
      {props.showApprovedIntentRules ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {props.approvedIntentPhrases.map((phrase) => (
            <div key={phrase.id} style={subtleCard}>
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
                  onClick={() => props.onDeleteApprovedIntentPhrase(phrase.id)}
                >
                  {RULES_TEXT.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <MemoryInterpreterSection
        memoryInterpreterSettings={props.memoryInterpreterSettings}
        onChangeMemoryInterpreterSettings={props.onChangeMemoryInterpreterSettings}
      />
      <PendingMemoryRuleCandidatesSection
        pendingMemoryRuleCandidates={props.pendingMemoryRuleCandidates}
        isMobile={props.isMobile}
        onApproveMemoryRuleCandidate={props.onApproveMemoryRuleCandidate}
        onRejectMemoryRuleCandidate={props.onRejectMemoryRuleCandidate}
        onUpdateMemoryRuleCandidate={props.onUpdateMemoryRuleCandidate}
      />
      <ApprovedMemoryRulesSection
        approvedMemoryRules={props.approvedMemoryRules}
        showApprovedMemoryRules={props.showApprovedMemoryRules}
        onToggleApprovedMemoryRules={props.onToggleApprovedMemoryRules}
        onDeleteApprovedMemoryRule={props.onDeleteApprovedMemoryRule}
      />
      <PendingIntentRulesSection
        pendingIntentCandidates={props.pendingIntentCandidates}
        onApproveIntentCandidate={props.onApproveIntentCandidate}
        onRejectIntentCandidate={props.onRejectIntentCandidate}
      />
      <ApprovedIntentRulesSection
        approvedIntentPhrases={props.approvedIntentPhrases}
        showApprovedIntentRules={props.showApprovedIntentRules}
        onToggleApprovedIntentRules={props.onToggleApprovedIntentRules}
        onDeleteApprovedIntentPhrase={props.onDeleteApprovedIntentPhrase}
      />
    </div>
  );
}
