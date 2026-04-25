import { describe, expect, it } from "vitest";
import {
  buildTaskTitlePrompt,
  extractTaskSummaryBlock,
  extractTaskTitlePayload,
  mergeTaskTitleInstructions,
  resolveTaskDraftUserInstruction,
} from "@/lib/task/taskTitleGeneration";

describe("taskTitleGeneration", () => {
  it("extracts the leading task summary block only", () => {
    expect(
      extractTaskSummaryBlock(
        [
          "【タスク整理結果】",
          "概要: 要点のまとめ",
          "",
          "■ 要点",
          "- a",
        ].join("\n")
      )
    ).toBe(["【タスク整理結果】", "概要: 要点のまとめ"].join("\n"));
  });

  it("builds a minimal title prompt from non-empty sections only", () => {
    const prompt = buildTaskTitlePrompt({
      currentTitle: "既存タイトル",
      taskBody: "【タスク整理結果】\n概要: 要点のまとめ\n\n■ 要点\n- a",
      additionalSource: "追加情報",
      userInstruction: "追加指示",
    });

    expect(prompt).toContain("Return JSON only.");
    expect(prompt).toContain('"title": string');
    expect(prompt).toContain("CURRENT_TITLE:\n既存タイトル");
    expect(prompt).toContain("TASK_SUMMARY_BLOCK:\n【タスク整理結果】\n概要: 要点のまとめ");
    expect(prompt).toContain("ADDITIONAL_SOURCE:\n追加情報");
    expect(prompt).toContain("USER_INSTRUCTION:\n追加指示");
  });

  it("omits the current title block when disabled", () => {
    const prompt = buildTaskTitlePrompt({
      currentTitle: "既存タイトル",
      additionalSource: "追加情報",
      includeCurrentTitle: false,
    });

    expect(prompt).not.toContain("CURRENT_TITLE:");
    expect(prompt).toContain("ADDITIONAL_SOURCE:\n追加情報");
  });

  it("merges unique task-title instructions in order", () => {
    expect(
      mergeTaskTitleInstructions("追加指示", "再整理", "追加指示", "")
    ).toBe(["追加指示", "再整理"].join("\n\n"));
  });

  it("reuses the same merge rule for task-draft instructions", () => {
    expect(
      resolveTaskDraftUserInstruction("追加指示", "再整理", "追加指示")
    ).toBe(["追加指示", "再整理"].join("\n\n"));
  });

  it("keeps task-update additional source separate from saved user instructions", () => {
    const prompt = buildTaskTitlePrompt({
      currentTitle: "競合比較におけるCodexの優位性と課題",
      taskBody: "【タスク整理結果】\n概要: 既存まとめ",
      additionalSource:
        "Codexユーザーの意見として、バグの原因を決めつけて無限ループに嵌る傾向もあると報告されている。",
      userInstruction: "競合との比較の観点で再整理して下さい。",
    });

    expect(prompt).toContain(
      "ADDITIONAL_SOURCE:\nCodexユーザーの意見として、バグの原因を決めつけて無限ループに嵌る傾向もあると報告されている。"
    );
    expect(prompt).toContain(
      "USER_INSTRUCTION:\n競合との比較の観点で再整理して下さい。"
    );
    expect(
      resolveTaskDraftUserInstruction(
        undefined,
        "競合との比較の観点で再整理して下さい。"
      )
    ).toBe("競合との比較の観点で再整理して下さい。");
  });

  it("parses JSON title payloads", () => {
    expect(extractTaskTitlePayload('{"title":"市場比較タスク"}')).toEqual({
      title: "市場比較タスク",
    });
  });
});
