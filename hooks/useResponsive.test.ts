import { describe, expect, it } from "vitest";
import { detectSinglePanelLayoutHeuristic } from "@/hooks/useResponsive";

describe("useResponsive helpers", () => {
  it("keeps touchscreen desktop widths in desktop layout", () => {
    expect(
      detectSinglePanelLayoutHeuristic({
        breakpoint: 1180,
        effectiveWidth: 1366,
        mobileUserAgent: false,
        touchLike: true,
      })
    ).toBe(false);
  });

  it("still treats narrow touch devices as mobile", () => {
    expect(
      detectSinglePanelLayoutHeuristic({
        breakpoint: 1180,
        effectiveWidth: 820,
        mobileUserAgent: false,
        touchLike: true,
      })
    ).toBe(true);
  });

  it("treats narrow desktop widths as single-panel even without touch", () => {
    expect(
      detectSinglePanelLayoutHeuristic({
        breakpoint: 1180,
        effectiveWidth: 1024,
        mobileUserAgent: false,
        touchLike: false,
      })
    ).toBe(true);
  });

  it("keeps wide non-touch desktop widths in desktop layout", () => {
    expect(
      detectSinglePanelLayoutHeuristic({
        breakpoint: 1180,
        effectiveWidth: 1366,
        mobileUserAgent: false,
        touchLike: false,
      })
    ).toBe(false);
  });

  it("always treats mobile user agents as mobile", () => {
    expect(
      detectSinglePanelLayoutHeuristic({
        breakpoint: 1180,
        effectiveWidth: 1366,
        mobileUserAgent: true,
        touchLike: false,
      })
    ).toBe(true);
  });
});
