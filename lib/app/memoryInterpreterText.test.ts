import { describe, expect, it } from "vitest";
import {
  isClosingReplyText,
  isSearchDirectiveText,
  normalizeText,
  normalizeTopicCandidate,
  stripTopicTail,
} from "@/lib/app/memoryInterpreterText";

describe("memoryInterpreterText", () => {
  it("normalizes whitespace and full-width variants", () => {
    expect(normalizeText("　東京　 タワー  ")).toBe("東京 タワー");
  });

  it("extracts a concise topic from a question", () => {
    expect(normalizeTopicCandidate("ナポレオンについて教えてください")).toBe(
      "ナポレオン"
    );
  });

  it("detects closing replies", () => {
    expect(isClosingReplyText("ありがとう、もう大丈夫です")).toBe(true);
    expect(isClosingReplyText("チェーホフについて教えて")).toBe(false);
  });

  it("detects search directives and trims topic tails", () => {
    expect(isSearchDirectiveText("検索: 東京の天気")).toBe(true);
    expect(stripTopicTail("チェーホフについて")).toBe("チェーホフ");
  });
});
