import { describe, expect, it } from "vitest";
import {
  extractQuestionSubject,
  isWeakTopicCandidate,
  normalizeTopicCandidate,
} from "@/lib/app/memory-interpreter/memoryInterpreterTopicExtractor";

describe("memoryInterpreterTopicExtractor", () => {
  it("extracts direct Japanese topics", () => {
    expect(extractQuestionSubject("日本の歴史を教えて下さい。")).toBe("日本の歴史");
    expect(extractQuestionSubject("ソクラテスについて知っていますか？")).toBe("ソクラテス");
    expect(extractQuestionSubject("ソクラテスのことを教えて下さい。")).toBe("ソクラテス");
    expect(
      extractQuestionSubject("ナポレオンについてもっと詳しく教えてください")
    ).toBe("ナポレオン");
    expect(
      extractQuestionSubject("なぜそんなにも長く続いて文化も栄えた縄文時代が終わってしまったのですか？")
    ).toBe("縄文時代");
  });

  it("treats pronoun and acknowledgement-led phrases as weak", () => {
    expect(isWeakTopicCandidate("それ")).toBe(true);
    expect(isWeakTopicCandidate("へー、彼の思想")).toBe(true);
    expect(isWeakTopicCandidate("プラトン")).toBe(false);
  });

  it("normalizes concise topics without preserving-only phrases", () => {
    expect(normalizeTopicCandidate("夏目漱石の弟子で一番有名なのは誰か知っていますか？")).toBe(
      "夏目漱石の弟子"
    );
    expect(normalizeTopicCandidate("それって本当ですか？")).toBe("");
    expect(normalizeTopicCandidate("なるほど！")).toBe("");
  });
});
