import type {
  PresentationTaskPlan,
  PresentationTaskBookendSlide,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
  PresentationTaskVisualSlot,
  PresentationTaskVisualMatch,
} from "@/types/task";
import type { PresentationImageLibraryCandidate } from "@/lib/app/presentation/presentationImageLibrary";

type CandidateScore = {
  candidate: PresentationImageLibraryCandidate;
  score: number;
};

export type PresentationVisualSlotNormalizedTextMap = Record<string, string>;

const MIN_SLOT_MATCH_SCORE = 5;

export function resolvePresentationVisualSlots(args: {
  plan: PresentationTaskPlan;
  imageCandidates: PresentationImageLibraryCandidate[];
  normalizedSlotTexts?: PresentationVisualSlotNormalizedTextMap;
}): PresentationTaskPlan {
  const candidates = args.imageCandidates.filter((candidate) => candidate.imageId.trim());
  if (candidates.length === 0 || args.plan.slideFrames.length === 0) return args.plan;

  return {
    ...args.plan,
    deckFrame: args.plan.deckFrame
      ? {
          ...args.plan.deckFrame,
          openingSlide: resolveOpeningSlideVisualSlots(
            args.plan.deckFrame.openingSlide,
            candidates,
            args.normalizedSlotTexts
          ),
        }
      : args.plan.deckFrame,
    slideFrames: args.plan.slideFrames.map((frame) =>
      resolveFrameVisualSlots(frame, candidates, args.normalizedSlotTexts)
    ),
  };
}

export function presentationVisualSlotMatchKey(slot: PresentationTaskVisualSlot) {
  const source = [
    slot.slotId,
    slot.label,
    slot.need,
    ...(slot.keywords || []),
    slot.order || "",
  ].join("\n");
  return `slot_${hashVisualSlotKeySource(source)}`;
}

function hashVisualSlotKeySource(source: string) {
  let hash = 2166136261;
  for (const char of source) {
    hash ^= char.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function resolveOpeningSlideVisualSlots(
  openingSlide: PresentationTaskBookendSlide | undefined,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  if (
    !openingSlide?.enabled ||
    openingSlide.frameId !== "visualTitleCover" ||
    !openingSlide.visualRequest
  ) {
    return openingSlide;
  }
  const coverBlock: PresentationTaskSlideBlock = {
    id: "openingVisual",
    kind: "visual",
    styleId: "visualCover",
    visualRequest: openingSlide.visualRequest,
  };
  const coverFrame: PresentationTaskSlideFrame = {
    slideNumber: 0,
    title: openingSlide.title || "Opening slide",
    masterFrameId: "fullBleedVisual",
    layoutFrameId: "adaptiveVisualMain",
    slideRole: "visualMain",
    blocks: [
      coverBlock,
      {
        id: "openingTitle",
        kind: "textStack",
        styleId: "textStackTopLeft",
        heading: openingSlide.title,
        text: [openingSlide.subtitle, openingSlide.message].filter(Boolean).join(" "),
      },
    ],
  };
  return {
    ...openingSlide,
    visualRequest: resolveVisualRequestSlots(
      coverBlock,
      coverFrame,
      candidates,
      normalizedSlotTexts,
      { preserveExistingImageIds: true }
    ),
  };
}

function resolveFrameVisualSlots(
  frame: PresentationTaskSlideFrame,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
): PresentationTaskSlideFrame {
  const blocks = frame.blocks.map((block) =>
    block.visualRequest
      ? {
          ...block,
          visualRequest: resolveVisualRequestSlots(
            block,
            frame,
            candidates,
            normalizedSlotTexts
          ),
        }
      : block
  );
  const primaryImageId =
    blocks.find((block) => block.visualRequest?.preferredImageId)?.visualRequest
      ?.preferredImageId || undefined;
  return {
    ...frame,
    layoutIntent: {
      ...frame.layoutIntent,
      primaryImageId,
    },
    blocks,
  };
}

function resolveVisualRequestSlots(
  block: PresentationTaskSlideBlock,
  frame: PresentationTaskSlideFrame,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined,
  options: { preserveExistingImageIds?: boolean } = {}
): PresentationTaskVisualRequest {
  const visual = block.visualRequest as PresentationTaskVisualRequest;
  if (
    hasUserConfirmedVisualSelection(visual) ||
    (options.preserveExistingImageIds && hasSelectedVisualImageIds(visual))
  ) {
    return visual;
  }
  const slots = normalizeSlots(visual.visualSlots);
  const effectiveSlots =
    slots.length > 0 ? slots : deriveVisualSlotsFromFrame(block, frame);
  const visualBase = {
    ...visual,
    visualSlots: effectiveSlots.length > 0 ? effectiveSlots : visual.visualSlots,
    preferredImageId: undefined,
    candidateImageIds: undefined,
    labels: undefined,
  };
  if (effectiveSlots.length === 0) return visualBase;

  const selected: Array<{ slot: PresentationTaskVisualSlot; match: CandidateScore }> = [];
  const selectionMatches: PresentationTaskVisualMatch[] = [];
  const usedImageIds = new Set<string>();
  for (const slot of effectiveSlots) {
    const bestOverall = findBestCandidateForSlot(
      slot,
      candidates,
      normalizedSlotTexts,
      undefined,
      0
    );
    const match =
      findBestCandidateForSlot(
        slot,
        candidates,
        normalizedSlotTexts,
        usedImageIds,
        MIN_SLOT_MATCH_SCORE
      ) ||
      findBestCandidateForSlot(
        slot,
        candidates,
        normalizedSlotTexts,
        undefined,
        MIN_SLOT_MATCH_SCORE
      );
    if (match) {
      selected.push({ slot, match });
      usedImageIds.add(match.candidate.imageId);
      selectionMatches.push(buildSelectionMatch(slot, match, "selected"));
    } else {
      selectionMatches.push(buildSelectionMatch(slot, bestOverall, "unresolved"));
    }
  }
  if (selected.length === 0) {
    return {
      ...visualBase,
      selectionMatches,
      promptNote: visual.promptNote || "No matching image-library asset selected for visualSlots.",
    };
  }

  const selectedIds = selected.map((item) => item.match.candidate.imageId);
  return {
    ...visualBase,
    preferredImageId: selectedIds[0],
    candidateImageIds: selectedIds,
    usagePolicy: selectedIds.length > 1 ? "useOneOrMore" : "useOneBest",
    maxVisualItems: selectedIds.length,
    labels: selected.map((item) => item.slot.label || candidateLabel(item.match.candidate)),
    selectionMatches,
    renderStyle: {
      ...visual.renderStyle,
      showBrief: true,
    },
  };
}

function hasUserConfirmedVisualSelection(visual: PresentationTaskVisualRequest) {
  const selectedIds = selectedVisualImageIdSet(visual);
  if (selectedIds.size === 0) return false;
  return (visual.selectionMatches || []).some(
    (match) =>
      match.status === "selected" &&
      !!match.imageId?.trim() &&
      selectedIds.has(match.imageId.trim())
  );
}

function hasSelectedVisualImageIds(visual: PresentationTaskVisualRequest) {
  return selectedVisualImageIdSet(visual).size > 0;
}

function selectedVisualImageIdSet(visual: PresentationTaskVisualRequest) {
  return new Set(
    [visual.preferredImageId, ...(visual.candidateImageIds || [])]
      .filter((imageId): imageId is string => !!imageId?.trim())
      .map((imageId) => imageId.trim())
  );
}

function normalizeSlots(slots: PresentationTaskVisualSlot[] | undefined) {
  return (slots || [])
    .filter((slot) => slot.need.trim() || slot.label.trim())
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function deriveVisualSlotsFromFrame(
  block: PresentationTaskSlideBlock,
  frame: PresentationTaskSlideFrame
): PresentationTaskVisualSlot[] {
  const visual = block.visualRequest;
  if (!visual) return [];
  const visualSegments = splitVisualNeedSegments([visual.brief, visual.prompt].filter(Boolean).join(" "));
  const textItems = frame.blocks
    .filter((item) => item !== block && !item.visualRequest)
    .flatMap((item) => [item.heading, item.text, ...(item.items || [])])
    .filter((item): item is string => !!item?.trim());
  const itemLabels = frame.blocks
    .filter((item) => item !== block && !item.visualRequest)
    .flatMap((item) => item.items || [])
    .map(extractItemLabel)
    .filter(Boolean);
  const sourceCount = Math.max(visualSegments.length, itemLabels.length);
  const count = Math.min(3, sourceCount);
  if (count <= 1) return [];

  return Array.from({ length: count }, (_, index) => {
    const label = itemLabels[index] || shortSlotLabel(visualSegments[index]) || `Visual ${index + 1}`;
    const need = [
      label,
      textItems[index],
      visualSegments[index],
    ]
      .filter(Boolean)
      .join(" ");
    return {
      slotId: `derived${index + 1}`,
      label,
      need,
      keywords: tokenize(need).slice(0, 8),
      order: index + 1,
    };
  });
}

function splitVisualNeedSegments(value: string) {
  return value
    .replace(/^photos?\s+(depicting|showing)\s+/i, "")
    .replace(/^photo collage\s+(depicting|showing)\s+/i, "")
    .split(/\s*(?:,|、|;|；|・|\band\b)\s*/iu)
    .map((item) => item.replace(/^(and|or)\s+/i, "").trim())
    .filter((item) => item.length >= 3 && !/^(photo|photos|diagram|image|visual)$/i.test(item));
}

function extractItemLabel(value: string) {
  return value.split(/[：:]/)[0]?.trim().slice(0, 18) || "";
}

function shortSlotLabel(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/\b(photo|photos|depicting|showing|industrial|inside|with)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}

function findBestCandidateForSlot(
  slot: PresentationTaskVisualSlot,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined,
  excludedImageIds: Set<string> | undefined = new Set(),
  minScore = MIN_SLOT_MATCH_SCORE
): CandidateScore | null {
  const scored = candidates
    .filter((candidate) => !excludedImageIds?.has(candidate.imageId))
    .map((candidate) => ({
      candidate,
      score: scoreSlotCandidate(slot, candidate, normalizedSlotTexts),
    }))
    .filter(
      (item) =>
        item.score >= minScore &&
        hasSpecificSlotEvidence(slot, item.candidate, normalizedSlotTexts) &&
        hasRequiredEntityEvidence(slot, item.candidate, normalizedSlotTexts)
    )
    .sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

function buildSelectionMatch(
  slot: PresentationTaskVisualSlot,
  match: CandidateScore | null,
  status: PresentationTaskVisualMatch["status"]
): PresentationTaskVisualMatch {
  const selected = status === "selected";
  return {
    slotId: slot.slotId,
    label: slot.label,
    need: slot.need,
    status,
    imageId: selected ? match?.candidate.imageId : undefined,
    imageTitle: selected && match ? candidateLabel(match.candidate) : undefined,
    score: match?.score || 0,
    threshold: MIN_SLOT_MATCH_SCORE,
  };
}

function scoreSlotCandidate(
  slot: PresentationTaskVisualSlot,
  candidate: PresentationImageLibraryCandidate,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const slotTerms = termsForSlot(slot, normalizedSlotTexts);
  if (slotTerms.length === 0) return 0;
  const candidateTerms = new Set(tokenize(candidateText(candidate, "primary")));
  const secondaryText = normalizeText(candidateText(candidate, "secondary"));
  let score = 0;
  for (const term of slotTerms) {
    if (candidateTerms.has(term)) {
      score += termScore(term, "primary");
    } else if (term.length >= 4 && secondaryText.includes(term)) {
      score += termScore(term, "secondary");
    }
  }
  return score;
}

function hasSpecificSlotEvidence(
  slot: PresentationTaskVisualSlot,
  candidate: PresentationImageLibraryCandidate,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const specificTerms = termsForSlot(slot, normalizedSlotTexts).filter(
    (term) => !BROAD_MATCH_TERMS.has(term)
  );
  if (specificTerms.length === 0) return false;
  const primaryTerms = new Set(tokenize(candidateText(candidate, "primary")));
  const secondaryText = normalizeText(candidateText(candidate, "secondary"));
  return specificTerms.some(
    (term) =>
      primaryTerms.has(term) || (term.length >= 4 && secondaryText.includes(term))
  );
}

function hasRequiredEntityEvidence(
  slot: PresentationTaskVisualSlot,
  candidate: PresentationImageLibraryCandidate,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const requiredEntities = requiredNamedPhraseGroupsForSlot(slot, normalizedSlotTexts);
  if (requiredEntities.length === 0) return true;
  const text = normalizeText(candidateText(candidate, "primary") + " " + candidateText(candidate, "secondary"));
  return requiredEntities.every((aliases) =>
    aliases.some((alias) => normalizedTextContainsAlias(text, alias))
  );
}

function termsForSlot(
  slot: PresentationTaskVisualSlot,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const normalizedText =
    normalizedSlotTexts?.[presentationVisualSlotMatchKey(slot)]?.trim() || "";
  return normalizedText ? tokenize(normalizedText) : [];
}

function candidateText(
  candidate: PresentationImageLibraryCandidate,
  tier: "primary" | "secondary"
) {
  const meta = candidate.presentationMeta;
  if (tier === "primary") {
    return [
      ...(meta?.visibleSubjects || []),
      ...(meta?.semanticTags || []),
      ...(meta?.embeddedTextItems.map((item) => item.text) || []),
      ...(meta?.relationships.flatMap((item) => item.items) || []),
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    ...(meta?.relationships.map((item) => item.evidence) || []),
    meta?.composition,
  ]
    .filter(Boolean)
    .join(" ");
}

function candidateLabel(candidate: PresentationImageLibraryCandidate) {
  return (
    candidate.presentationMeta?.visibleSubjects.find(Boolean) ||
    candidate.presentationMeta?.embeddedTextItems.find((item) => item.text.trim())?.text ||
    candidate.title ||
    candidate.imageId
  );
}

function tokenize(value: string) {
  const normalized = normalizeText(value);
  const words = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2 && !STOP_TERMS.has(term));
  const cjkBigrams = Array.from(normalized.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2,}/gu))
    .flatMap((match) => bigrams(match[0]))
    .filter((term) => !STOP_TERMS.has(term));
  return Array.from(new Set([...words, ...cjkBigrams]));
}

function bigrams(value: string) {
  const chars = Array.from(value);
  if (chars.length <= 2) return [value];
  return chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFKC");
}

function termScore(term: string, tier: "primary" | "secondary") {
  const base = term.length >= 5 ? 3 : term.length >= 3 ? 2 : 1;
  return tier === "primary" ? base : Math.max(1, base - 1);
}

const STOP_TERMS = new Set([
  "and",
  "for",
  "the",
  "with",
  "image",
  "photo",
  "picture",
  "visual",
]);

const BROAD_MATCH_TERMS = new Set([
  "cotton",
  "organic",
  "sustainable",
  "sustainability",
  "product",
  "products",
  "environment",
  "environmental",
  "issue",
  "issues",
  "challenge",
  "challenges",
  "risk",
  "risks",
  "supply",
  "chain",
]);

function requiredNamedPhraseGroupsForSlot(
  slot: PresentationTaskVisualSlot,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const rawText = normalizedSlotTexts?.[presentationVisualSlotMatchKey(slot)] || "";
  const quoted = Array.from(rawText.matchAll(/["'`]([^"'`]{2,40})["'`]/g))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => !!value && !isGenericNamedPhrase(value));
  const acronyms = Array.from(rawText.matchAll(/\b[A-Z][A-Z0-9&.-]{1,12}\b/g))
    .map((match) => match[0]?.trim())
    .filter(
      (value): value is string =>
        !!value && !isGenericNamedPhrase(value)
    );
  return Array.from(new Set([...quoted, ...acronyms])).map((value) => [value]);
}

function normalizedTextContainsAlias(normalizedText: string, alias: string) {
  const normalizedAlias = normalizeText(alias);
  if (/^[a-z0-9.]+$/i.test(normalizedAlias) && normalizedAlias.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedAlias)}([^a-z0-9]|$)`, "i")
      .test(normalizedText);
  }
  return normalizedText.includes(normalizedAlias);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGenericNamedPhrase(value: string) {
  return GENERIC_NAMED_PHRASES.has(normalizeText(value));
}

const GENERIC_NAMED_PHRASES = new Set([
  "ppt",
  "pptx",
  "pdf",
  "json",
  "id",
  "image",
  "photo",
  "visual",
]);

