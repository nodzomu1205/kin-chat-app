import { describe, expect, it } from "vitest";
import {
  buildTrackedEntities,
  extractFacts,
  extractPreferences,
  extractRecentSearchQueries,
  extractWorksByEntityFromTable,
  pruneFactsForTopic,
} from "@/lib/app/memoryInterpreterFacts";
import type { Message } from "@/types/chat";

function buildMessage(role: Message["role"], text: string): Message {
  return { id: `${role}-${text}`, role, text };
}

describe("memoryInterpreterFacts", () => {
  it("extracts recent search queries from user messages", () => {
    expect(
      extractRecentSearchQueries([
        buildMessage("user", "検索: 東京の天気"),
        buildMessage("user", "search: napoleon marshals"),
      ])
    ).toEqual(["東京の天気", "napoleon marshals"]);
  });

  it("extracts normalized preferences from user messages", () => {
    expect(
      extractPreferences([
        buildMessage("user", "日本語でお願いします"),
        buildMessage("user", "Please be brief"),
      ])
    ).toEqual(["日本語で回答してほしい", "簡潔に回答してほしい"]);
  });

  it("extracts useful facts and ignores follow-up invitation text", () => {
    expect(
      extractFacts([
        buildMessage(
          "gpt",
          "ドストエフスキーは『罪と罰』で知られるロシアの作家です。\n\n興味があれば他の作品も紹介できます。"
        ),
      ])
    ).toEqual(["ドストエフスキーは『罪と罰』で知られるロシアの作家です。"]);
  });

  it("extracts works from a table and builds tracked entities", () => {
    const worksByEntity = extractWorksByEntityFromTable(
      "| 作家名 | 作品 |\n| --- | --- |\n| チェーホフ | 桜の園、かもめ |"
    );

    expect(worksByEntity).toEqual({
      チェーホフ: ["桜の園", "かもめ"],
    });

    expect(
      buildTrackedEntities(
        {
          facts: [],
          preferences: [],
          lists: { trackedEntities: ["ロシア文学"] },
          context: {},
        },
        "チェーホフ",
        worksByEntity,
        false
      )
    ).toEqual(["ロシア文学", "チェーホフ"]);
  });

  it("prunes facts differently when the topic switches", () => {
    expect(pruneFactsForTopic(["old"], ["new"], true)).toEqual(["new"]);
    expect(pruneFactsForTopic(["old"], ["new"], false)).toEqual(["old", "new"]);
  });
});
