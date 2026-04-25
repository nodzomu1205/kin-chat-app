import type { ApprovedMemoryRule } from "@/lib/memory-domain/memoryInterpreterRules";
import { normalizeText } from "@/lib/app/memory-interpreter/memoryInterpreterText";

type RulePatternMetadata = Pick<
  ApprovedMemoryRule,
  "evidenceText" | "leftContext" | "rightContext" | "surfacePattern"
>;

export const STRONG_RULE_MATCH_SCORE = 210;

function getRecencyBoost(lastUsedAt?: string) {
  if (!lastUsedAt) return 0;
  const lastUsedTime = Date.parse(lastUsedAt);
  if (!Number.isFinite(lastUsedTime)) return 0;
  const ageMs = Date.now() - lastUsedTime;
  if (ageMs <= 0) return 6;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 1) return 6;
  if (ageDays < 7) return 4;
  if (ageDays < 30) return 2;
  return 0;
}

export function normalizePatternFragment(text?: string | null) {
  return normalizeText(text || "");
}

export function buildPatternMetadata(args: {
  text: string;
  evidenceText?: string | null;
  leftContext?: string | null;
  rightContext?: string | null;
  surfacePattern?: string | null;
}): RulePatternMetadata {
  const normalizedText = normalizeText(args.text);
  const evidenceText = normalizePatternFragment(args.evidenceText);
  const leftContext = normalizePatternFragment(args.leftContext);
  const rightContext = normalizePatternFragment(args.rightContext);
  const surfacePattern = normalizePatternFragment(args.surfacePattern);

  if (!evidenceText) {
    return {
      evidenceText: undefined,
      leftContext: undefined,
      rightContext: undefined,
      surfacePattern: surfacePattern || undefined,
    };
  }

  const evidenceIndex = normalizedText.indexOf(evidenceText);
  if (evidenceIndex < 0) {
    return {
      evidenceText,
      leftContext: leftContext || undefined,
      rightContext: rightContext || undefined,
      surfacePattern: surfacePattern || undefined,
    };
  }

  const inferredLeftContext =
    leftContext ||
    normalizedText.slice(Math.max(0, evidenceIndex - 12), evidenceIndex).trim();
  const inferredRightContext =
    rightContext ||
    normalizedText
      .slice(evidenceIndex + evidenceText.length, evidenceIndex + evidenceText.length + 12)
      .trim();

  return {
    evidenceText,
    leftContext: inferredLeftContext || undefined,
    rightContext: inferredRightContext || undefined,
    surfacePattern: surfacePattern || normalizedText,
  };
}

export function scoreApprovedMemoryRuleMatch(text: string, rule: ApprovedMemoryRule) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return -1;

  const surfacePattern = normalizePatternFragment(rule.surfacePattern);
  const evidenceText = normalizePatternFragment(rule.evidenceText);
  const leftContext = normalizePatternFragment(rule.leftContext);
  const rightContext = normalizePatternFragment(rule.rightContext);
  const phrase = normalizePatternFragment(rule.phrase);

  if (surfacePattern && surfacePattern === normalizedText) {
    return (
      400 +
      surfacePattern.length +
      Math.min(rule.approvedCount ?? 0, 20) -
      Math.min(rule.rejectedCount ?? 0, 20) +
      getRecencyBoost(rule.lastUsedAt)
    );
  }

  const anchor = evidenceText || phrase;
  if (!anchor) return -1;

  const anchorIndex = normalizedText.indexOf(anchor);
  if (anchorIndex < 0) return -1;

  if (leftContext) {
    const leftSlice = normalizedText.slice(0, anchorIndex);
    if (!leftSlice.includes(leftContext)) return -1;
  }
  if (rightContext) {
    const rightSlice = normalizedText.slice(anchorIndex + anchor.length);
    if (!rightSlice.includes(rightContext)) return -1;
  }

  let score = 100 + anchor.length;
  if (evidenceText) score += 80;
  if (leftContext) score += 20 + leftContext.length;
  if (rightContext) score += 20 + rightContext.length;
  if (rule.approvedCount) score += Math.min(rule.approvedCount, 10);
  if (rule.rejectedCount) score -= Math.min(rule.rejectedCount * 3, 18);
  score += getRecencyBoost(rule.lastUsedAt);
  return score;
}

export function findBestApprovedMemoryRuleMatch(
  text: string,
  approvedRules: ApprovedMemoryRule[]
) {
  let bestRule: ApprovedMemoryRule | null = null;
  let bestScore = -1;

  for (const rule of approvedRules) {
    const score = scoreApprovedMemoryRuleMatch(text, rule);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return bestRule;
}

export function findBestApprovedMemoryRuleMatchWithScore(
  text: string,
  approvedRules: ApprovedMemoryRule[]
) {
  const rule = findBestApprovedMemoryRuleMatch(text, approvedRules);
  return {
    rule,
    score: rule ? scoreApprovedMemoryRuleMatch(text, rule) : -1,
  };
}

export function hasStrongApprovedMemoryRuleMatch(
  text: string,
  approvedRules: ApprovedMemoryRule[]
) {
  return (
    findBestApprovedMemoryRuleMatchWithScore(text, approvedRules).score >=
    STRONG_RULE_MATCH_SCORE
  );
}
