import { describe, expect, it } from "vitest";
import {
  detectMobileUserAgent,
  detectSinglePanelLayoutHeuristic,
  detectTouchCapability,
  resolveEffectiveWidth,
} from "@/lib/app/ui-state/responsiveLayout";

describe("useResponsive helpers", () => {
  it("detects mobile user agents without treating desktop strings as mobile", () => {
    expect(detectMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)"))
      .toBe(true);
    expect(detectMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"))
      .toBe(false);
  });

  it("detects touch capability from any supported signal", () => {
    expect(
      detectTouchCapability({
        hasTouchStart: false,
        maxTouchPoints: 2,
        coarsePointer: false,
      })
    ).toBe(true);

    expect(
      detectTouchCapability({
        hasTouchStart: false,
        maxTouchPoints: 0,
        coarsePointer: false,
      })
    ).toBe(false);
  });

  it("uses the narrowest available viewport width", () => {
    expect(
      resolveEffectiveWidth([1440, 1366, 1280, undefined, null, 0])
    ).toBe(1280);
    expect(resolveEffectiveWidth([undefined, null, 0])).toBe(
      Number.POSITIVE_INFINITY
    );
  });

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
