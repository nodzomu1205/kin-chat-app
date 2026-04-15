import { describe, expect, it } from "vitest";
import { classifyMemoryUtterance } from "@/lib/app/memoryInterpreterUtterance";

describe("memoryInterpreterUtterance", () => {
  it("classifies an initial topic request without forcing preserve", () => {
    const result = classifyMemoryUtterance("日本の歴史を教えて下さい。");

    expect(result.normalizedText).toBe("日本の歴史を教えて下さい。");
    expect(result.localTopicCandidate).toBe("日本の歴史");
    expect(result.preservesExistingTopic).toBe(false);
    expect(result.hasCurrentTopic).toBe(false);
  });

  it("detects a narrower subtopic under an existing topic", () => {
    const result = classifyMemoryUtterance(
      "なぜそんなにも長く続いて文化も栄えた縄文時代が終わってしまったのですか？",
      "日本の歴史"
    );

    expect(result.currentTopic).toBe("日本の歴史");
    expect(result.localTopicCandidate).toBe("縄文時代");
    expect(result.possibleSubtopic).toBe("縄文時代");
    expect(result.looksLikeQuestionOrRequest).toBe(true);
  });
});
