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

function getCandidateIntentValue(
  candidate: PendingMemoryRuleCandidate
): UserUtteranceIntent {
  if (candidate.intent) return candidate.intent;
  if (candidate.kind === "closing_reply") return "acknowledgement";
  if (candidate.kind === "topic_alias") return "question";
  return "unknown";
}

function getCandidateTopicDecisionValue(
  candidate: PendingMemoryRuleCandidate
): TopicDecision {
  if (candidate.topicDecision) return candidate.topicDecision;
  if (candidate.kind === "closing_reply") return "keep";
  if (candidate.kind === "topic_alias") return "switch";
  return "unclear";
}

function formatMemoryRuleKind(
  kind: PendingMemoryRuleCandidate["kind"] | ApprovedMemoryRule["kind"]
) {
  switch (kind) {
    case "utterance_review":
      return "発話レビュー";
    case "topic_alias":
      return "topic 関連";
    default:
      return "closing reply 関連";
  }
}

function MemoryInterpreterSection(props: {
  memoryInterpreterSettings: MemoryInterpreterSettings;
  onChangeMemoryInterpreterSettings: (
    patch: Partial<MemoryInterpreterSettings>
  ) => void;
}) {
  return (
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
          help="判定しにくい topic / closing reply を LLM で補完判定します。"
        />
        <ToggleButtons
          label="候補を保存"
          checked={props.memoryInterpreterSettings.saveRuleCandidates}
          onChange={(value) =>
            props.onChangeMemoryInterpreterSettings({
              saveRuleCandidates: value,
            })
          }
          help="LLM fallback が見つけた Memory ルール候補をレビュー用キューへ残します。"
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
      <div style={{ ...labelStyle, marginBottom: 8 }}>Memory ルール候補</div>
      <div style={{ ...helpTextStyle, marginBottom: 8 }}>
        判定が難しい発話について、会話全体の文脈を LLM で補完して候補化します。
      </div>
      {props.pendingMemoryRuleCandidates.length === 0 ? (
        <div style={helpTextStyle}>
          現在、レビュー待ちの Memory ルール候補はありません。
        </div>
      ) : (
        props.pendingMemoryRuleCandidates.map((candidate) => (
          <div key={candidate.id} style={{ ...subtleCard, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {formatMemoryRuleKind(candidate.kind)}候補
            </div>
            <div style={{ ...helpTextStyle, marginTop: 6 }}>
              入力語句: {candidate.phrase}
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
                  placeholder="keep の場合の話題名"
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
                承認
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
        承認済みルールは、必要時に LLM fallback で topic や facts の補正に使われます。
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
                {formatMemoryRuleKind(rule.kind)}
              </div>
              <div style={{ ...helpTextStyle, marginTop: 6 }}>
                入力語句: {rule.phrase}
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
                  トピック正規化: {rule.normalizedValue}
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
        SYS フォーマットルール候補
      </div>
      <div style={{ ...helpTextStyle, marginBottom: 8 }}>
        こちらは SYS フォーマットや要求表現の候補です。Memory 関連候補とは別系統です。
      </div>
      {props.pendingIntentCandidates.length === 0 ? (
        <div style={helpTextStyle}>
          現在、SYS フォーマットルール候補はありません。
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
          ? "承認済み SYS ルールを閉じる"
          : `承認済み SYS ルールを表示 (${props.approvedIntentPhrases.length})`}
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
