import { describe, expect, it } from "vitest";
import {
  isClosingReplyText,
  isCorrectionOrDisputeText,
  isGenericContinuationQuestion,
  isGenericCorrectionReply,
  isGenericFollowUpRequest,
  isSearchDirectiveText,
  isShortAcknowledgementText,
  isTruthCheckQuestion,
  normalizeText,
  normalizeTopicCandidate,
  shouldPreserveExistingTopic,
  stripTopicTail,
} from "@/lib/app/memoryInterpreterText";

describe("memoryInterpreterText", () => {
  it("normalizes whitespace and full-width variants", () => {
    expect(normalizeText("\u3000\u6771\u4eac\u3000 \u30bf\u30ef\u30fc  ")).toBe(
      "\u6771\u4eac \u30bf\u30ef\u30fc"
    );
  });

  it("extracts a concise topic from a question", () => {
    expect(
      normalizeTopicCandidate(
        "\u30ca\u30dd\u30ec\u30aa\u30f3\u306b\u3064\u3044\u3066\u6559\u3048\u3066\u304f\u3060\u3055\u3044"
      )
    ).toBe("\u30ca\u30dd\u30ec\u30aa\u30f3");
    expect(
      normalizeTopicCandidate(
        "\u590f\u76ee\u6f31\u77f3\u306e\u5f1f\u5b50\u3067\u4e00\u756a\u6709\u540d\u306a\u306e\u306f\u8ab0\u304b\u77e5\u3063\u3066\u3044\u307e\u3059\u304b\uff1f"
      )
    ).toBe("\u590f\u76ee\u6f31\u77f3\u306e\u5f1f\u5b50");
    expect(
      normalizeTopicCandidate(
        "\u30bd\u30af\u30e9\u30c6\u30b9\u306b\u3064\u3044\u3066\u77e5\u3063\u3066\u3044\u307e\u3059\u304b\uff1f"
      )
    ).toBe("\u30bd\u30af\u30e9\u30c6\u30b9");
    expect(
      normalizeTopicCandidate(
        "\u65e5\u672c\u306e\u6b74\u53f2\u3092\u6559\u3048\u3066\u4e0b\u3055\u3044\u3002"
      )
    ).toBe("\u65e5\u672c\u306e\u6b74\u53f2");
    expect(
      normalizeTopicCandidate(
        "\u306a\u305c\u305d\u3093\u306a\u306b\u3082\u9577\u304f\u7d9a\u3044\u3066\u6587\u5316\u3082\u6804\u3048\u305f\u7e04\u6587\u6642\u4ee3\u304c\u7d42\u308f\u3063\u3066\u3057\u307e\u3063\u305f\u306e\u3067\u3059\u304b\uff1f"
      )
    ).toBe("\u7e04\u6587\u6642\u4ee3");
    expect(
      normalizeTopicCandidate(
        "\u30c1\u30a7\u30fc\u30db\u30d5\u306e\u4f5c\u54c1\u306b\u3064\u3044\u3066\u3082\u3063\u3068\u8a73\u3057\u304f\u6559\u3048\u3066\u304f\u3060\u3055\u3044"
      )
    ).toBe("\u30c1\u30a7\u30fc\u30db\u30d5\u306e\u4f5c\u54c1");
    expect(
      normalizeTopicCandidate(
        "\u30bd\u30af\u30e9\u30c6\u30b9\u306e\u3053\u3068\u3092\u6559\u3048\u3066\u4e0b\u3055\u3044"
      )
    ).toBe("\u30bd\u30af\u30e9\u30c6\u30b9");
  });

  it("detects closing replies", () => {
    expect(
      isClosingReplyText(
        "\u3042\u308a\u304c\u3068\u3046\u3001\u3082\u3046\u5927\u4e08\u592b\u3067\u3059"
      )
    ).toBe(true);
    expect(
      isClosingReplyText(
        "\u30c1\u30a7\u30fc\u30db\u30d5\u306b\u3064\u3044\u3066\u6559\u3048\u3066"
      )
    ).toBe(false);
  });

  it("treats generic follow-up requests as non-topics", () => {
    expect(
      isGenericFollowUpRequest(
        "\u306f\u3044\u3001\u3082\u3063\u3068\u8a73\u3057\u304f\u6559\u3048\u3066\u4e0b\u3055\u3044\uff01"
      )
    ).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u306f\u3044\u3001\u3082\u3063\u3068\u8a73\u3057\u304f\u6559\u3048\u3066\u4e0b\u3055\u3044\uff01"
      )
    ).toBe("");
    expect(
      normalizeTopicCandidate(
        "\u590f\u76ee\u6f31\u77f3\u306b\u3064\u3044\u3066\u3082\u3063\u3068\u8a73\u3057\u304f\u6559\u3048\u3066\u4e0b\u3055\u3044"
      )
    ).toBe("\u590f\u76ee\u6f31\u77f3");
    expect(
      isGenericFollowUpRequest(
        "\u3082\u3046\u5c11\u3057\u304f\u308f\u3057\u304f\u8aac\u660e\u3057\u3066\u304f\u3060\u3055\u3044"
      )
    ).toBe(true);
    expect(
      isGenericFollowUpRequest(
        "\u4ed6\u306b\u306f\u8ab0\u304c\u3044\u307e\u3059\u304b\uff1f"
      )
    ).toBe(false);
  });

  it("treats generic correction replies as non-topics", () => {
    expect(
      isGenericCorrectionReply(
        "\u305d\u308c\u3001\u5618\u3067\u3057\u3087"
      )
    ).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u305d\u308c\u3001\u5618\u3067\u3057\u3087"
      )
    ).toBe("");
    expect(
      normalizeTopicCandidate(
        "\u3044\u3084\u3060\u304b\u3089\u5927\u6b63\u6587\u58c7\u306e\u5bf5\u5150\u3092\u77e5\u3089\u306a\u3044\u3053\u3068\u3001\u3054\u307e\u304b\u3057\u3066\u5225\u306e\u8a71\u984c\u306b\u3057\u3088\u3046\u3068\u3057\u305f\u308f\u3051\u306d\u4eca"
      )
    ).toBe("");
  });

  it("treats dispute statements like 'all of that is false' as non-topics", () => {
    expect(
      isCorrectionOrDisputeText(
        "\u305d\u308c\u3089\u306f\u5168\u3066\u865a\u507d\u3067\u306f?"
      )
    ).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u305d\u308c\u3089\u306f\u5168\u3066\u865a\u507d\u3067\u306f?"
      )
    ).toBe("");
  });

  it("treats truth-check questions as non-topics", () => {
    expect(
      isTruthCheckQuestion(
        "\u305d\u308c\u3063\u3066\u672c\u5f53\u3067\u3059\u304b\uff1f"
      )
    ).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u305d\u308c\u3063\u3066\u672c\u5f53\u3067\u3059\u304b\uff1f"
      )
    ).toBe("");
  });

  it("treats short acknowledgements as non-topics", () => {
    expect(isShortAcknowledgementText("\u306a\u308b\u307b\u3069\uff01")).toBe(true);
    expect(normalizeTopicCandidate("\u306a\u308b\u307b\u3069\uff01")).toBe("");
    expect(shouldPreserveExistingTopic("\u306a\u308b\u307b\u3069\uff01")).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u3078\u30fc\u3001\u5f7c\u306e\u601d\u60f3\u306b\u3064\u3044\u3066\u6559\u3048\u3066\u4e0b\u3055\u3044\uff01"
      )
    ).toBe("");
    expect(
      shouldPreserveExistingTopic(
        "\u306a\u308b\u307b\u3069\u4e00\u756a\u9577\u3044\u306e\u306f\u7e04\u6587\u6642\u4ee3\u306a\u3093\u3067\u3059\u306d"
      )
    ).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u306a\u308b\u307b\u3069\u4e00\u756a\u9577\u3044\u306e\u306f\u7e04\u6587\u6642\u4ee3\u306a\u3093\u3067\u3059\u306d"
      )
    ).toBe("");
    expect(
      normalizeTopicCandidate("\u3042\u3042\u3001\u6700\u8fd1\u5929\u6c17\u60aa\u3044\u306a\u3042!")
    ).toBe("");
  });

  it("preserves the current topic for acknowledgement-led comments", () => {
    expect(
      shouldPreserveExistingTopic(
        "\u3078\u30fc\u3001\u305d\u308c\u306f\u9762\u767d\u3044\u3067\u3059\u306d"
      )
    ).toBe(true);
    expect(
      shouldPreserveExistingTopic(
        "\u306a\u308b\u307b\u3069\u3001\u305d\u3046\u3044\u3046\u80cc\u666f\u3060\u3063\u305f\u3093\u3067\u3059\u306d"
      )
    ).toBe(true);
  });

  it("treats continuation questions with correction text as preserving the current topic", () => {
    expect(
      isGenericContinuationQuestion(
        "\u4ed6\u306b\u306f\u8ab0\u304c\u3044\u307e\u3059\u304b"
      )
    ).toBe(true);
    expect(
      shouldPreserveExistingTopic(
        "\u4ed6\u306b\u306f\u8ab0\u304c\u3044\u307e\u3059\u304b? \u5618\u306f\u30c0\u30e1\u3067\u3059\u3088\u3002"
      )
    ).toBe(true);
    expect(
      normalizeTopicCandidate(
        "\u4ed6\u306b\u306f\u8ab0\u304c\u3044\u307e\u3059\u304b? \u5618\u306f\u30c0\u30e1\u3067\u3059\u3088\u3002"
      )
    ).toBe("");
    expect(
      isGenericContinuationQuestion(
        "\u307b\u304b\u306b\u306f\u3069\u3093\u306a\u4eba\u304c\u3044\u307e\u3059\u304b\uff1f"
      )
    ).toBe(true);
    expect(
      isGenericContinuationQuestion(
        "\u3082\u3046\u5c11\u3057\u8a73\u3057\u304f\u6559\u3048\u3066\u304f\u3060\u3055\u3044"
      )
    ).toBe(false);
  });

  it("detects search directives and trims topic tails", () => {
    expect(
      isSearchDirectiveText(
        "search: \u6771\u4eac\u306e\u5929\u6c17"
      )
    ).toBe(true);
    expect(
      isSearchDirectiveText(
        "\u691c\u7d22: \u6771\u4eac\u306e\u5929\u6c17"
      )
    ).toBe(true);
    expect(
      isSearchDirectiveText(
        "\u691c\u7d22\uff1a\u6771\u4eac\u306e\u5929\u6c17"
      )
    ).toBe(true);
    expect(
      stripTopicTail(
        "\u30c1\u30a7\u30fc\u30db\u30d5\u306b\u3064\u3044\u3066"
      )
    ).toBe("\u30c1\u30a7\u30fc\u30db\u30d5");
    expect(
      stripTopicTail(
        "\u30ca\u30dd\u30ec\u30aa\u30f3\u306b\u3064\u3044\u3066\u3082\u3063\u3068\u8a73\u3057\u304f\u6559\u3048\u3066\u304f\u3060\u3055\u3044"
      )
    ).toBe("\u30ca\u30dd\u30ec\u30aa\u30f3");
    expect(
      stripTopicTail(
        "\u30bd\u30af\u30e9\u30c6\u30b9\u306e\u3053\u3068\u3092\u6559\u3048\u3066\u4e0b\u3055\u3044"
      )
    ).toBe("\u30bd\u30af\u30e9\u30c6\u30b9");
  });
});
