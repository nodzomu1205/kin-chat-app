export type SinglePanelLayoutHeuristicParams = {
  breakpoint: number;
  effectiveWidth: number;
  mobileUserAgent: boolean;
  touchLike: boolean;
};

export function detectMobileUserAgent(userAgent?: string | null) {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
    userAgent || ""
  );
}

export function detectTouchCapability(params: {
  hasTouchStart: boolean;
  maxTouchPoints?: number | null;
  coarsePointer: boolean;
}) {
  return (
    params.hasTouchStart ||
    (params.maxTouchPoints ?? 0) > 0 ||
    params.coarsePointer
  );
}

export function resolveEffectiveWidth(
  candidates: Array<number | null | undefined>
) {
  const resolvedCandidates = candidates.filter(
    (value): value is number => typeof value === "number" && value > 0
  );

  if (resolvedCandidates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...resolvedCandidates);
}

export function detectSinglePanelLayoutHeuristic(
  params: SinglePanelLayoutHeuristicParams
) {
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

