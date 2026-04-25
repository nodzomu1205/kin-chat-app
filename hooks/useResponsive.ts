import { useEffect, useState } from "react";
import {
  detectMobileUserAgent,
  detectSinglePanelLayoutHeuristic,
  detectTouchCapability,
  resolveEffectiveWidth,
} from "@/lib/app/ui-state/responsiveLayout";

// This module decides only whether the workspace should use the single-panel
// layout. It must not choose which panel is focused.
function hasMobileUserAgent() {
  if (typeof navigator === "undefined") return false;

  return detectMobileUserAgent(navigator.userAgent);
}

function hasTouchCapability() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return detectTouchCapability({
    hasTouchStart: "ontouchstart" in window,
    maxTouchPoints: navigator.maxTouchPoints,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches === true,
  });
}

function getEffectiveWidth() {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;

  return resolveEffectiveWidth([
    window.innerWidth,
    window.outerWidth,
    window.visualViewport?.width,
    window.screen?.width,
    window.screen?.availWidth,
  ]);
}

function detectSinglePanelLayout(breakpoint: number) {
  if (typeof window === "undefined") return false;

  return detectSinglePanelLayoutHeuristic({
    breakpoint,
    effectiveWidth: getEffectiveWidth(),
    mobileUserAgent: hasMobileUserAgent(),
    touchLike: hasTouchCapability(),
  });
}

export function useResponsive(breakpoint = 1180) {
  const [isSinglePanelLayout, setIsSinglePanelLayout] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsSinglePanelLayout(detectSinglePanelLayout(breakpoint));
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      viewport?.removeEventListener("resize", update);
    };
  }, [breakpoint]);

  return isSinglePanelLayout;
}
