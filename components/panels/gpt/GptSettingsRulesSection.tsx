"use client";

import React from "react";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/task/taskIntent";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";
import { helpTextStyle, labelStyle } from "./gptPanelStyles";
import {
  sectionCard,
  tabButton,
  ToggleButtons,
} from "./GptSettingsShared";
import {
  GPT_SETTINGS_RULES_TEXT,
} from "./gptSettingsText";
import {
  ApprovedIntentRuleCard,
  ApprovedMemoryRuleCard,
  PendingIntentRuleCard,
  PendingMemoryRuleCandidateCard,
} from "./GptSettingsRuleCards";

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
          <PendingMemoryRuleCandidateCard
            key={candidate.id}
            candidate={candidate}
            isMobile={props.isMobile}
            onApprove={props.onApproveMemoryRuleCandidate}
            onReject={props.onRejectMemoryRuleCandidate}
            onUpdate={props.onUpdateMemoryRuleCandidate}
          />
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
            <ApprovedMemoryRuleCard
              key={rule.id}
              rule={rule}
              onDelete={props.onDeleteApprovedMemoryRule}
            />
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
          <PendingIntentRuleCard
            key={candidate.id}
            candidate={candidate}
            onApprove={props.onApproveIntentCandidate}
            onReject={props.onRejectIntentCandidate}
          />
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
            <ApprovedIntentRuleCard
              key={phrase.id}
              phrase={phrase}
              onDelete={props.onDeleteApprovedIntentPhrase}
            />
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
