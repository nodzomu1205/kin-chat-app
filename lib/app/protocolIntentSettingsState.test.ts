import { describe, expect, it } from "vitest";
import {
  loadProtocolIntentSettingsState,
} from "@/lib/app/protocolIntentSettingsState";
import {
  APPROVED_INTENT_PHRASES_KEY,
  PENDING_INTENT_CANDIDATES_KEY,
  PROTOCOL_PROMPT_DEFAULT_KEY,
  REJECTED_INTENT_CANDIDATES_KEY,
} from "@/lib/app/chatPageStorageKeys";

function createStorage(values: Record<string, string | null>) {
  return {
    getItem(key: string) {
      return key in values ? values[key] : null;
    },
  };
}

describe("protocolIntentSettingsState", () => {
  it("returns defaults when storage is unavailable", () => {
    expect(loadProtocolIntentSettingsState(null)).toMatchObject({
      pendingIntentCandidates: [],
      approvedIntentPhrases: [],
      rejectedIntentCandidateSignatures: [],
    });
  });

  it("normalizes saved candidate and phrase entries", () => {
    const state = loadProtocolIntentSettingsState(
      createStorage({
        [PENDING_INTENT_CANDIDATES_KEY]: JSON.stringify([
          { phrase: "ＡＢＣ", sourceText: "１２３" },
        ]),
        [APPROVED_INTENT_PHRASES_KEY]: JSON.stringify([
          { phrase: "ＸＹＺ" },
        ]),
        [REJECTED_INTENT_CANDIDATES_KEY]: JSON.stringify(["sig-1"]),
      })
    );

    expect(state.pendingIntentCandidates).toHaveLength(1);
    expect(state.pendingIntentCandidates[0]?.phrase).toBe("ABC");
    expect(state.pendingIntentCandidates[0]?.sourceText).toBe("123");
    expect(state.approvedIntentPhrases).toHaveLength(1);
    expect(state.approvedIntentPhrases[0]?.phrase).toBe("XYZ");
    expect(state.rejectedIntentCandidateSignatures).toEqual(["sig-1"]);
  });

  it("migrates protocol prompt text from legacy defaults", () => {
    const state = loadProtocolIntentSettingsState(
      createStorage({
        [PROTOCOL_PROMPT_DEFAULT_KEY]:
          "Keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.",
      })
    );

    expect(state.protocolPrompt).toContain("700 characters");
    expect(state.protocolPrompt).toContain("3200-3600");
  });
});
