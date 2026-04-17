import { describe, expect, it, vi } from "vitest";
import {
  buildSinglePanelFocusHandler,
  focusPanelIfSingleLayout,
  normalizeSinglePanelActiveTab,
} from "@/lib/app/panelLayout";

describe("panelLayout", () => {
  it("keeps desktop tabs untouched", () => {
    expect(
      normalizeSinglePanelActiveTab({
        isSinglePanelLayout: false,
        activeTab: "kin",
      })
    ).toBe("kin");
    expect(
      normalizeSinglePanelActiveTab({
        isSinglePanelLayout: false,
        activeTab: "gpt",
      })
    ).toBe("gpt");
  });

  it("keeps valid single-panel tabs stable", () => {
    expect(
      normalizeSinglePanelActiveTab({
        isSinglePanelLayout: true,
        activeTab: "kin",
      })
    ).toBe("kin");
    expect(
      normalizeSinglePanelActiveTab({
        isSinglePanelLayout: true,
        activeTab: "gpt",
      })
    ).toBe("gpt");
  });

  it("focuses only in single-panel layout", () => {
    const setActiveTab = vi.fn();

    expect(
      focusPanelIfSingleLayout({
        isSinglePanelLayout: false,
        setActiveTab,
        tab: "kin",
      })
    ).toBe(false);
    expect(setActiveTab).not.toHaveBeenCalled();

    expect(
      focusPanelIfSingleLayout({
        isSinglePanelLayout: true,
        setActiveTab,
        tab: "gpt",
      })
    ).toBe(true);
    expect(setActiveTab).toHaveBeenCalledWith("gpt");
  });

  it("builds optional focus handlers only for single-panel layout", () => {
    const setActiveTab = vi.fn();

    expect(
      buildSinglePanelFocusHandler({
        isSinglePanelLayout: false,
        setActiveTab,
        tab: "kin",
      })
    ).toBeUndefined();

    const focusKin = buildSinglePanelFocusHandler({
      isSinglePanelLayout: true,
      setActiveTab,
      tab: "kin",
    });

    expect(focusKin).toBeTypeOf("function");
    focusKin?.();
    expect(setActiveTab).toHaveBeenCalledWith("kin");
  });
});
