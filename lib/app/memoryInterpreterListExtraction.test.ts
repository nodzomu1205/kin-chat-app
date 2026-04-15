import { describe, expect, it } from "vitest";
import {
  buildTrackedEntities,
  extractPreferences,
  extractRecentSearchQueries,
  extractWorksByEntityFromTable,
} from "@/lib/app/memoryInterpreterListExtraction";
import type { Message } from "@/types/chat";

function buildMessage(role: Message["role"], text: string): Message {
  return { id: `${role}-${text}`, role, text };
}

describe("memoryInterpreterListExtraction", () => {
  it("extracts recent searches and preferences", () => {
    expect(
      extractRecentSearchQueries([
        buildMessage("user", "検索: 東京の天気"),
        buildMessage("user", "search: napoleon marshals"),
      ])
    ).toEqual(["東京の天気", "napoleon marshals"]);

    expect(
      extractPreferences([
        buildMessage("user", "日本語でお願いします"),
        buildMessage("user", "Please be brief"),
      ])
    ).toEqual(["日本語で回答してほしい", "簡潔に回答してほしい"]);
  });

  it("extracts works and tracked entities", () => {
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
});
