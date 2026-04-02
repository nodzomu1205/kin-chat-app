import { useEffect, useState } from "react";

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

function detectMobile(breakpoint: number) {
  if (typeof window === "undefined") return false;

  const effectiveWidth = getEffectiveWidth();
  const mobileUA = hasMobileUserAgent();
  const touchLike = hasTouchCapability();

  if (mobileUA) return true;
  if (effectiveWidth <= breakpoint) return true;
  if (touchLike && effectiveWidth <= breakpoint * 1.35) return true;

  return false;
}

export function useResponsive(breakpoint = 1180) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsMobile(detectMobile(breakpoint));
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

  return isMobile;
}