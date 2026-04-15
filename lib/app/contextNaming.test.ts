import { describe, expect, it } from "vitest";
import { resolveDraftTitle, suggestTaskTitle } from "@/lib/app/contextNaming";
import { createEmptyTaskDraft } from "@/types/task";

describe("contextNaming", () => {
  it("extracts a concise task title from a sentence-like input", () => {
    expect(
      suggestTaskTitle({
        freeText: "日本の歴史についてもっと詳しく教えてください。",
      })
    ).toBe("日本の歴史");
  });

  it("extracts a concise title from task-result text instead of truncating the first sentence", () => {
    expect(
      suggestTaskTitle({
        freeText:
          "[タスク整理結果]\n概要: 森鴎外と夏目漱石の関係について、時代背景と作品比較を整理する。\n\n- 森鴎外の時代背景\n- 夏目漱石との比較",
      })
    ).toBe("森鴎外と夏目漱石の関係");
  });

  it("ignores generic summary leads like その点", () => {
    expect(
      suggestTaskTitle({
        freeText:
          "[タスク整理結果]\n概要: 「その点」に関する見解として、森鴎外と夏目漱石の関係には時代差がある。\n\n- 背景整理",
      })
    ).toBe("森鴎外と夏目漱石の関係");
  });

  it("extracts quoted work names when they are the most concrete title signal", () => {
    expect(
      suggestTaskTitle({
        freeText: "はい、「檸檬」「蜜柑」「あばばばば」が好きです。",
      })
    ).toBe("檸檬・蜜柑・あばばばば");
  });

  it("keeps deriving a concise title even when a draft already exists", () => {
    expect(
      resolveDraftTitle(
        {
          ...createEmptyTaskDraft(),
          title: "既存タスク",
          taskName: "既存タスク",
        },
        {
          freeText: "日本の歴史について整理したいです。",
        }
      )
    ).toBe("日本の歴史");
  });
});
