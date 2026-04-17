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

describe("gptSettingsReviewText", () => {
  it("keeps review labels stable", () => {
    expect(GPT_SETTINGS_REVIEW_TEXT.memoryReviewTitle).toBe("文脈レビュー");
    expect(GPT_SETTINGS_RULES_TEXT.pendingSysTitle).toBe(
      "SYS フォーマットルール候補"
    );
  });

  it("formats review labels in Japanese", () => {
    expect(formatIntentLabel("acknowledgement")).toBe("相槌");
    expect(formatTopicDecisionLabel("switch")).toBe("切替");
    expect(formatMemoryRuleKind("utterance_review")).toBe("文脈レビュー");
    expect(formatIntentPhraseKindLabel("search_request")).toBe("検索依頼回数");
  });

  it("derives fallback values for pending memory candidates", () => {
    expect(
      getCandidateIntentValue({
        id: "1",
        kind: "closing_reply",
        phrase: "了解",
        sourceText: "了解しました",
      })
    ).toBe("acknowledgement");

    expect(
      getCandidateTopicDecisionValue({
        id: "2",
        kind: "topic_alias",
        phrase: "次の話題",
        sourceText: "話題を変えたい",
      })
    ).toBe("switch");
  });
});
