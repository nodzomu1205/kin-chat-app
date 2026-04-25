import { describe, expect, it } from "vitest";
import {
  buildSearchPresetSelection,
  buildToggledSearchEngineSelection,
  normalizeSourceDisplayCountInput,
  resolveActiveSearchMode,
} from "@/components/panels/gpt/GptSettingsSearchState";

describe("GptSettingsSearchState", () => {
  it("resolves active search mode from engines before stored mode", () => {
    expect(
      resolveActiveSearchMode({
        searchMode: "normal",
        searchEngines: ["google_search", "google_ai_mode"],
      })
    ).toBe("integrated");
    expect(
      resolveActiveSearchMode({
        searchMode: "ai_first",
        searchEngines: [],
      })
    ).toBe("integrated");
  });

  it("builds preset mode and engine updates", () => {
    expect(buildSearchPresetSelection("geo")).toEqual({
      searchMode: "geo",
      searchEngines: ["google_maps", "google_local"],
    });
  });

  it("toggles search engines and reports matching presets", () => {
    expect(
      buildToggledSearchEngineSelection({
        searchEngines: ["google_search"],
        engine: "google_ai_mode",
      })
    ).toEqual({
      searchEngines: ["google_search", "google_ai_mode"],
      inferredSearchMode: "integrated",
    });
    expect(
      buildToggledSearchEngineSelection({
        searchEngines: ["google_search"],
        engine: "google_search",
      })
    ).toEqual({
      searchEngines: [],
      inferredSearchMode: undefined,
    });
  });

  it("normalizes source display count into the supported range", () => {
    expect(
      normalizeSourceDisplayCountInput({ input: "abc", currentValue: 6 })
    ).toBe(6);
    expect(
      normalizeSourceDisplayCountInput({ input: "999", currentValue: 6 })
    ).toBe(20);
    expect(
      normalizeSourceDisplayCountInput({ input: "0", currentValue: 6 })
    ).toBe(1);
  });
});
