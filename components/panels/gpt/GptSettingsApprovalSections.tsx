"use client";

import React from "react";
import type {
  GptPanelProtocolProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import { helpTextStyle, labelStyle } from "@/components/panels/gpt/gptPanelStyles";
import { sectionCard, tabButton } from "@/components/panels/gpt/GptSettingsSections";
import {
  GPT_SETTINGS_REVIEW_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import {
  buildOriginalSuggestedTopicMap,
  resolveMemoryReviewTopicInputValue,
} from "@/components/panels/gpt/GptSettingsApprovalState";
import {
  ApprovedMemoryRuleCard,
  ApprovedSysRulePhraseCard,
  PendingMemoryCandidateCard,
  PendingSysRuleCandidateCard,
} from "@/components/panels/gpt/GptSettingsApprovalCards";
import {
  CountBadge,
  SectionHeaderRow,
} from "@/components/panels/gpt/GptSettingsShared";
import type { PendingMemoryRuleCandidate } from "@/lib/memory-domain/memoryInterpreterRules";

const WORKSPACE_REVIEW_TEXT = GPT_SETTINGS_REVIEW_TEXT;

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
  const currentTopic = props.currentTopic?.trim() || "";
  const originalSuggestedTopics = React.useMemo(
    () => buildOriginalSuggestedTopicMap(props.pendingCandidates),
    [props.pendingCandidates]
  );

  const resolveCandidateTopicInputValue = React.useCallback(
    (candidate: PendingMemoryRuleCandidate) => {
      return resolveMemoryReviewTopicInputValue({
        candidate,
        currentTopic,
        originalSuggestedTopic: originalSuggestedTopics[candidate.id] || "",
      });
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
              <ApprovedMemoryRuleCard
                key={rule.id}
                rule={rule}
                onDelete={props.onDelete}
              />
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
            <PendingMemoryCandidateCard
              key={candidate.id}
              candidate={candidate}
              currentTopic={currentTopic}
              isMobile={props.isMobile}
              originalSuggestedTopic={originalSuggestedTopics[candidate.id] || ""}
              topicInputValue={resolveCandidateTopicInputValue(candidate)}
              onUpdate={props.onUpdate}
              onApprove={props.onApprove}
              onReject={props.onReject}
            />
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
            <PendingSysRuleCandidateCard
              key={candidate.id}
              candidate={candidate}
              onUpdate={props.onUpdate}
              onApprove={props.onApprove}
              onReject={props.onReject}
            />
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
              <ApprovedSysRulePhraseCard
                key={phrase.id}
                phrase={phrase}
                onUpdateApproved={props.onUpdateApproved}
                onDelete={props.onDelete}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
