import { describe, expect, it } from "vitest";
import {
  normalizeContinuationSeriesId,
  parseSearchContinuation,
} from "@/lib/search-domain/continuations";

describe("continuations", () => {
  it("parses compact AI-mode continuation markers", () => {
    expect(parseSearchContinuation("ロシアの経済状況について教えて下さい。(#1)")).toEqual({
      cleanQuery: "ロシアの経済状況について教えて下さい。",
      seriesId: "#1",
    });
  });

  it("keeps legacy Japanese continuation markers compatible", () => {
    expect(parseSearchContinuation("戦争の影響に絞って分析して下さい。（継続#1）")).toEqual({
      cleanQuery: "戦争の影響に絞って分析して下さい。",
      seriesId: "#1",
    });
  });

  it("normalizes continuation series identifiers", () => {
    expect(normalizeContinuationSeriesId("1")).toBe("#1");
    expect(normalizeContinuationSeriesId("#2")).toBe("#2");
    expect(normalizeContinuationSeriesId("")).toBe("");
  });
});
