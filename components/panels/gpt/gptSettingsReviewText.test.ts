import { describe, expect, it } from "vitest";
import {
  formatIntentLabel,
  formatIntentPhraseKindLabel,
  formatMemoryRuleKind,
  formatTopicDecisionLabel,
  getCandidateIntentValue,
  getCandidateTopicDecisionValue,
  GPT_SETTINGS_REVIEW_TEXT,
  GPT_SETTINGS_RULES_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import { GPT_PROTOCOL_AUTOMATION_LABELS } from "@/components/panels/gpt/gptProtocolAutomationText";
import { GPT_TOOLBAR_TEXT_OVERRIDES } from "@/components/panels/gpt/gptUiTextOverrides";

describe("gptSettingsReviewText", () => {
  it("keeps review labels stable", () => {
    expect(typeof GPT_SETTINGS_REVIEW_TEXT.memoryReviewTitle).toBe("string");
    expect(typeof GPT_SETTINGS_RULES_TEXT.pendingSysTitle).toBe("string");
    expect(GPT_PROTOCOL_AUTOMATION_LABELS[0]).toBe(
      "A. Kin入力欄のSYSフォーマットを自動送信"
    );
    expect(GPT_TOOLBAR_TEXT_OVERRIDES.attachSearchResult).toBe("データ取込");
  });

  it("formats review labels through the shared text tables", () => {
    expect(formatIntentLabel("acknowledgement")).toBeTruthy();
    expect(formatTopicDecisionLabel("switch")).toBeTruthy();
    expect(formatMemoryRuleKind("utterance_review")).toBeTruthy();
    expect(formatIntentPhraseKindLabel("search_request")).toBeTruthy();
  });

  it("derives fallback values for pending memory candidates", () => {
    expect(
      getCandidateIntentValue({
        id: "1",
        kind: "closing_reply",
        phrase: "thanks",
        sourceText: "thanks for the update",
        createdAt: new Date().toISOString(),
      })
    ).toBe("acknowledgement");

    expect(
      getCandidateTopicDecisionValue({
        id: "2",
        kind: "topic_alias",
        phrase: "same topic",
        sourceText: "same topic, different wording",
        createdAt: new Date().toISOString(),
      })
    ).toBe("switch");
  });
});
