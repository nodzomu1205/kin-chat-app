import { describe, expect, it } from "vitest";
import {
  getActiveDocumentRecord,
  resolveActiveDocumentFields,
  resolveWorksByEntityState,
} from "@/lib/app/memory-interpreter/memoryInterpreterWorks";
import type { Memory } from "@/lib/memory";

function buildMemory(overrides?: Partial<Memory>): Memory {
  return {
    facts: [],
    preferences: [],
    lists: {},
    context: {},
    ...overrides,
  };
}

describe("memoryInterpreterWorks", () => {
  it("prefers an active document override over memory state", () => {
    const result = getActiveDocumentRecord(
      buildMemory({
        lists: {
          activeDocument: { title: "Stored Doc" },
        },
      }),
      { title: "Override Doc" }
    );

    expect(result).toEqual({ title: "Override Doc" });
  });

  it("resolves active document title and excerpt fields", () => {
    const result = resolveActiveDocumentFields(buildMemory(), {
      title: "Doc A",
      excerpt: "Summary text",
    });

    expect(result).toEqual({
      activeDocument: {
        title: "Doc A",
        excerpt: "Summary text",
      },
      activeDocumentTitle: "Doc A",
      activeDocumentExcerpt: "Summary text",
    });
  });

  it("merges quoted works into the current topic when allowed", () => {
    const result = resolveWorksByEntityState({
      currentMemory: buildMemory({
        lists: {
          worksByEntity: {
            チェーホフ: ["かもめ"],
          },
        },
      }),
      resolvedTopic: "チェーホフ",
      topicSwitched: false,
      activeDocumentExcerpt: "",
      latestAssistantText: "チェーホフの『桜の園』は後期の代表作です。",
      worksAllowed: true,
    });

    expect(result.quotedWorks).toEqual(["桜の園"]);
    expect(result.worksByEntity).toEqual({
      チェーホフ: ["かもめ", "桜の園"],
    });
  });

  it("keeps table-derived works even when quoted works are empty", () => {
    const result = resolveWorksByEntityState({
      currentMemory: buildMemory(),
      resolvedTopic: "チェーホフ",
      topicSwitched: false,
      activeDocumentExcerpt:
        "| 作家名 | 作品 |\n| --- | --- |\n| チェーホフ | 桜の園、かもめ |",
      latestAssistantText: "",
      worksAllowed: false,
    });

    expect(result.tableWorksByEntity).toEqual({
      チェーホフ: ["桜の園", "かもめ"],
    });
    expect(result.worksByEntity).toEqual({
      チェーホフ: ["桜の園", "かもめ"],
    });
  });
});
