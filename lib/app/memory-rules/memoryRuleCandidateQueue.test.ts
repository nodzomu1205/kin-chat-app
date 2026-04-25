import { describe, expect, it } from "vitest";
import {
  mergePendingMemoryRuleCandidates,
  trimPendingMemoryRuleCandidates,
} from "@/lib/app/memory-rules/memoryRuleCandidateQueue";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";

const buildCandidate = (
  id: string,
  sourceText: string,
  phrase = sourceText,
  normalizedValue?: string
): PendingMemoryRuleCandidate => ({
  id,
  kind: "utterance_review",
  phrase,
  sourceText,
  normalizedValue,
  createdAt: "2026-04-15T00:00:00.000Z",
});

describe("memoryRuleCandidateQueue", () => {
  it("keeps only candidates from the most recent two sources", () => {
    const trimmed = trimPendingMemoryRuleCandidates([
      buildCandidate("1", "source-1"),
      buildCandidate("2", "source-2"),
      buildCandidate("3", "source-3"),
    ]);

    expect(trimmed.map((item) => item.sourceText)).toEqual(["source-2", "source-3"]);
  });

  it("skips duplicates and approved equivalents while merging", () => {
    const prev = [buildCandidate("1", "source-a", "phrase-a", "Topic A")];
    const approvedMemoryRules: ApprovedMemoryRule[] = [
      {
        id: "approved-1",
        kind: "utterance_review",
        phrase: "phrase-b",
        sourceText: "source-b",
        normalizedValue: "Topic B",
        createdAt: "2026-04-15T00:00:00.000Z",
      } as PendingMemoryRuleCandidate,
    ];

    const merged = mergePendingMemoryRuleCandidates({
      prev,
      approvedMemoryRules,
      candidates: [
        buildCandidate("2", "source-a", "phrase-a", "Topic A"),
        buildCandidate("3", "source-b", "phrase-b", "Topic B"),
        buildCandidate("4", "source-c", "phrase-c", "Topic C"),
      ],
    });

    expect(merged.map((item) => item.sourceText)).toEqual(["source-a", "source-c"]);
  });
});
