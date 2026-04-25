import { describe, expect, it, vi } from "vitest";
import { useMemoryRuleActions } from "@/hooks/useMemoryRuleActions";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";

const candidate: PendingMemoryRuleCandidate = {
  id: "memcand-1",
  phrase: "move",
  kind: "topic_alias",
  normalizedValue: "move planning",
  createdAt: "2026-04-14T00:00:00.000Z",
  sourceText: "I want to talk about moving",
};

function createSettingsSetter(initial: MemoryInterpreterSettings) {
  let current = initial;
  const setter = vi.fn((updater) => {
    current =
      typeof updater === "function"
        ? updater(current)
        : updater;
  });
  return { setter, getCurrent: () => current };
}

function createArraySetter<T>(initial: T[]) {
  let current = initial;
  const setter = vi.fn((updater) => {
    current =
      typeof updater === "function"
        ? updater(current)
        : updater;
  });
  return { setter, getCurrent: () => current };
}

describe("useMemoryRuleActions", () => {
  it("reapplies with the next rejected signatures after rejecting a candidate", async () => {
    const settings = createSettingsSetter({
      llmFallbackEnabled: true,
      saveRuleCandidates: true,
    });
    const pending = createArraySetter<PendingMemoryRuleCandidate>([candidate]);
    const approved = createArraySetter<ApprovedMemoryRule>([]);
    const rejected = createArraySetter<string>([]);
    const onRejectCandidateApplied = vi.fn();

    const actions = useMemoryRuleActions({
      setMemoryInterpreterSettings: settings.setter,
      pendingMemoryRuleCandidates: [candidate],
      approvedMemoryRules: [],
      setPendingMemoryRuleCandidates: pending.setter,
      setApprovedMemoryRules: approved.setter,
      setRejectedMemoryRuleCandidateSignatures: rejected.setter,
      onRejectCandidateApplied,
    });

    await actions.rejectMemoryRuleCandidate(candidate.id);

    expect(rejected.getCurrent()).toEqual([
      "topic_alias|move planning",
      "topic_alias|move",
      "topic_alias|I want to talk about moving|move planning||",
      "topic_alias|I want to talk about moving",
    ]);
    expect(pending.getCurrent()).toEqual([]);
    expect(onRejectCandidateApplied).toHaveBeenCalledWith(
      candidate,
      [
        "topic_alias|move planning",
        "topic_alias|move",
        "topic_alias|I want to talk about moving|move planning||",
        "topic_alias|I want to talk about moving",
      ]
    );
  });

  it("reapplies with the next approved rules after approving a candidate", async () => {
    const settings = createSettingsSetter({
      llmFallbackEnabled: true,
      saveRuleCandidates: true,
    });
    const pending = createArraySetter<PendingMemoryRuleCandidate>([candidate]);
    const approved = createArraySetter<ApprovedMemoryRule>([]);
    const rejected = createArraySetter<string>([]);
    const onApproveCandidateApplied = vi.fn();

    const actions = useMemoryRuleActions({
      setMemoryInterpreterSettings: settings.setter,
      pendingMemoryRuleCandidates: [candidate],
      approvedMemoryRules: [],
      setPendingMemoryRuleCandidates: pending.setter,
      setApprovedMemoryRules: approved.setter,
      setRejectedMemoryRuleCandidateSignatures: rejected.setter,
      onApproveCandidateApplied,
    });

    await actions.approveMemoryRuleCandidate(candidate.id);

    expect(approved.getCurrent()).toHaveLength(1);
    expect(approved.getCurrent()[0]).toEqual(
      expect.objectContaining({
        phrase: "move",
        normalizedValue: "move planning",
        approvedCount: 1,
      })
    );
    expect(pending.getCurrent()).toEqual([]);
    expect(onApproveCandidateApplied).toHaveBeenCalledWith(
      candidate,
      approved.getCurrent()
    );
  });

  it("increments approvedCount when the same rule is approved again", async () => {
    const settings = createSettingsSetter({
      llmFallbackEnabled: true,
      saveRuleCandidates: true,
    });
    const pending = createArraySetter<PendingMemoryRuleCandidate>([candidate]);
    const approved = createArraySetter<ApprovedMemoryRule>([
      {
        id: "rule-1",
        phrase: "move",
        kind: "topic_alias",
        normalizedValue: "move planning",
        approvedCount: 2,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
    ]);
    const rejected = createArraySetter<string>([]);

    const actions = useMemoryRuleActions({
      setMemoryInterpreterSettings: settings.setter,
      pendingMemoryRuleCandidates: [candidate],
      approvedMemoryRules: approved.getCurrent(),
      setPendingMemoryRuleCandidates: pending.setter,
      setApprovedMemoryRules: approved.setter,
      setRejectedMemoryRuleCandidateSignatures: rejected.setter,
    });

    await actions.approveMemoryRuleCandidate(candidate.id);

    expect(approved.getCurrent()).toEqual([
      expect.objectContaining({
        id: "rule-1",
        approvedCount: 3,
      }),
    ]);
  });

  it("increments rejectedCount on matching approved rules when rejecting a candidate", async () => {
    const settings = createSettingsSetter({
      llmFallbackEnabled: true,
      saveRuleCandidates: true,
    });
    const pending = createArraySetter<PendingMemoryRuleCandidate>([candidate]);
    const approved = createArraySetter<ApprovedMemoryRule>([
      {
        id: "rule-1",
        phrase: "move",
        kind: "topic_alias",
        normalizedValue: "move planning",
        approvedCount: 2,
        rejectedCount: 1,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
    ]);
    const rejected = createArraySetter<string>([]);

    const actions = useMemoryRuleActions({
      setMemoryInterpreterSettings: settings.setter,
      pendingMemoryRuleCandidates: [candidate],
      approvedMemoryRules: approved.getCurrent(),
      setPendingMemoryRuleCandidates: pending.setter,
      setApprovedMemoryRules: approved.setter,
      setRejectedMemoryRuleCandidateSignatures: rejected.setter,
    });

    await actions.rejectMemoryRuleCandidate(candidate.id);

    expect(approved.getCurrent()).toEqual([
      expect.objectContaining({
        id: "rule-1",
        rejectedCount: 2,
      }),
    ]);
  });

  it("removes same-signature and same-phrase pending duplicates when approving", async () => {
    const settings = createSettingsSetter({
      llmFallbackEnabled: true,
      saveRuleCandidates: true,
    });
    const duplicateByPhrase: PendingMemoryRuleCandidate = {
      ...candidate,
      id: "memcand-2",
      normalizedValue: "another value",
    };
    const pending = createArraySetter<PendingMemoryRuleCandidate>([
      candidate,
      duplicateByPhrase,
    ]);
    const approved = createArraySetter<ApprovedMemoryRule>([]);
    const rejected = createArraySetter<string>([]);

    const actions = useMemoryRuleActions({
      setMemoryInterpreterSettings: settings.setter,
      pendingMemoryRuleCandidates: [candidate, duplicateByPhrase],
      approvedMemoryRules: [],
      setPendingMemoryRuleCandidates: pending.setter,
      setApprovedMemoryRules: approved.setter,
      setRejectedMemoryRuleCandidateSignatures: rejected.setter,
    });

    await actions.approveMemoryRuleCandidate(candidate.id);

    expect(pending.getCurrent()).toEqual([]);
  });
});
