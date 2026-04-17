import { useEffect, useState } from "react";

// This module decides only whether the workspace should use the single-panel
// layout. It must not choose which panel is focused.
function hasMobileUserAgent() {
  if (typeof navigator === "undefined") return false;

  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
    navigator.userAgent || ""
  );
}

function hasTouchCapability() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

function getEffectiveWidth() {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;

  const candidates = [
    window.innerWidth,
    window.outerWidth,
    window.visualViewport?.width,
    window.screen?.width,
    window.screen?.availWidth,
  ].filter((value): value is number => typeof value === "number" && value > 0);

  if (candidates.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...candidates);
}

export function detectSinglePanelLayoutHeuristic(params: {
  breakpoint: number;
  effectiveWidth: number;
  mobileUserAgent: boolean;
  touchLike: boolean;
}) {
  if (params.mobileUserAgent) return true;
  if (params.effectiveWidth <= params.breakpoint) return true;
  if (
    params.touchLike &&
    params.effectiveWidth <= Math.min(860, params.breakpoint)
  ) {
    return true;
  }

  return false;
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
