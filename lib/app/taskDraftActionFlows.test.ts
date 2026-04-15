import { describe, expect, it } from "vitest";
import { resolveTaskTitleFromResult } from "@/lib/app/taskDraftActionFlows";

describe("resolveTaskTitleFromResult", () => {
  it("re-evaluates the title from the updated task result when no explicit title is given", () => {
    const title = resolveTaskTitleFromResult({
      currentTitle: "既存タスク",
      currentTaskName: "既存タスク",
      resultText:
        "[タスク整理結果]\n概要: 森鴎外と夏目漱石の関係について、時代背景と作品比較を整理する。\n\n- 森鴎外の時代背景\n- 夏目漱石との比較",
      fallback: "既存タスク",
      getResolvedTaskTitle: ({ freeText, fallback }) =>
        freeText?.includes("森鴎外と夏目漱石の関係")
          ? "森鴎外と夏目漱石の関係"
          : fallback || "タスク",
    });

    expect(title).toBe("森鴎外と夏目漱石の関係");
  });

  it("keeps the explicit title when one is provided", () => {
    const title = resolveTaskTitleFromResult({
      explicitTitle: "固定タイトル",
      currentTitle: "既存タスク",
      currentTaskName: "既存タスク",
      resultText: "森鴎外と夏目漱石の関係について整理する。",
      fallback: "既存タスク",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "タスク",
    });

    expect(title).toBe("固定タイトル");
  });
});
