import { describe, expect, it } from "vitest";
import {
  buildInterpretedMemoryState,
  buildMemoryStateAssemblyInputs,
  buildMemoryStateAssemblyLists,
} from "@/lib/app/memoryInterpreterStateAssembly";

describe("memoryInterpreterStateAssembly", () => {
  it("does not derive a new topic from raw input text by default", () => {
    const result = buildMemoryStateAssemblyInputs({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: { currentTopic: "日本の歴史" },
      },
      recentMessages: [
        { id: "u1", role: "user", text: "日本の歴史を教えて下さい" },
        { id: "g1", role: "gpt", text: "日本の歴史は..." },
        { id: "u2", role: "user", text: "縄文時代についてもっと詳しく教えて" },
      ],
    });

    expect(result.latestPrompt).toBe("縄文時代についてもっと詳しく教えて");
    expect(result.resolvedTopic).toBe("日本の歴史");
    expect(result.topicSwitched).toBe(false);
  });

  it("builds lists with search queries, entities, and works", () => {
    const lists = buildMemoryStateAssemblyLists({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: { trackedEntities: ["ロシア文学"] },
        context: {},
      },
      resolvedTopic: "チェーホフ",
      topicSwitched: false,
      activeDocument: { title: "作家メモ" },
      activeDocumentTitle: "作家メモ",
      activeDocumentExcerpt:
        "| 作家名 | 作品 |\n| --- | --- |\n| チェーホフ | 桜の園、かもめ |",
      latestAssistantText: "チェーホフの代表作は、桜の園、かもめです。",
      recentSearchQueries: ["チェーホフ 作品"],
    });

    expect(lists.recentSearchQueries).toEqual(["チェーホフ 作品"]);
    expect(lists.trackedEntities).toEqual(["ロシア文学", "チェーホフ"]);
    expect(lists.worksByEntity).toEqual({
      チェーホフ: ["桜の園", "かもめ"],
    });
  });

  it("allows works extraction when literature hints appear in clean Japanese text", () => {
    const lists = buildMemoryStateAssemblyLists({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      resolvedTopic: "ロシア文学",
      topicSwitched: false,
      activeDocument: null,
      activeDocumentTitle: "文学メモ",
      activeDocumentExcerpt:
        "| 作家名 | 作品 |\n| --- | --- |\n| ドストエフスキー | 罪と罰 |",
      latestAssistantText: "ドストエフスキーの代表作は罪と罰です。",
      recentSearchQueries: [],
    });

    expect(lists.worksByEntity).toEqual({
      ドストエフスキー: ["罪と罰"],
    });
  });

  it("builds the final patch from extracted components", () => {
    const patch = buildInterpretedMemoryState({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "日本の歴史",
          currentTask: "ユーザーは日本の歴史について知りたい",
          followUpRule: "短い追質問は、直前の日本の歴史トピックを引き継いで解釈する",
        },
      },
      recentMessages: [
        { id: "u1", role: "user", text: "日本の歴史を教えて下さい" },
        { id: "g1", role: "gpt", text: "日本の歴史はとても長いです。" },
        { id: "u2", role: "user", text: "縄文時代についてもっと詳しく教えて" },
      ],
    });

    expect(patch.context?.currentTopic).toBe("日本の歴史");
    expect(patch.context?.currentTask).toContain("日本の歴史");
    expect(Array.isArray(patch.preferences)).toBe(true);
  });

  it("does not fall back to raw input-topic inference when fallback explicitly disables it", () => {
    const patch = buildInterpretedMemoryState({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      recentMessages: [{ id: "u1", role: "user", text: "ああ、最近天気悪いなあ" }],
      options: {
        topicAdjudication: {
          disableInputTopicInference: true,
        },
      },
    });

    expect(patch.context?.currentTopic).toBeUndefined();
  });

  it("re-exports the input and list builders used by the final state assembly", () => {
    expect(typeof buildMemoryStateAssemblyInputs).toBe("function");
    expect(typeof buildMemoryStateAssemblyLists).toBe("function");
  });

  it("ignores SYS-formatted user text when choosing the latest prompt", () => {
    const result = buildMemoryStateAssemblyInputs({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      recentMessages: [
        { id: "u1", role: "user", text: "Normal chat about Napoleon" },
        { id: "u2", role: "user", text: "<<SYS_TASK>>\nBODY: hidden\n<<END_SYS_TASK>>" },
      ],
    });

    expect(result.latestPrompt).toBe("Normal chat about Napoleon");
  });
});
