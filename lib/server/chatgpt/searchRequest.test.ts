import { describe, expect, it } from "vitest";
import { resolveSearchRequest } from "@/lib/server/chatgpt/searchRequest";

describe("resolveSearchRequest", () => {
  it("prefers forcedSearchQuery when provided", () => {
    const resolved = resolveSearchRequest({
      input: "検索: ignored",
      forcedSearchQuery: "forced query",
      searchSeriesId: "SER-1",
    });

    expect(resolved.searchQuery).toBe("forced query");
    expect(resolved.useSearch).toBe(true);
    expect(resolved.effectiveSeriesId).toBe("SER-1");
  });

  it("extracts prefixed search query from input", () => {
    const resolved = resolveSearchRequest({
      input: "検索: ナポレオン 元帥",
    });

    expect(resolved.searchQuery).toBe("ナポレオン 元帥");
    expect(resolved.useSearch).toBe(true);
    expect(resolved.continuation.cleanQuery).toBe("ナポレオン 元帥");
  });

  it("returns no-search state when no query is present", () => {
    const resolved = resolveSearchRequest({
      input: "ただの会話です",
    });

    expect(resolved.searchQuery).toBe("");
    expect(resolved.useSearch).toBe(false);
    expect(resolved.continuation.cleanQuery).toBe("");
    expect(resolved.effectiveSeriesId).toBe("");
  });
});
