import { describe, expect, it } from "vitest";
import {
  buildLatestGptTaskUpdateIntent,
  buildLibraryTaskAttachIntent,
  buildLibraryTaskFormationIntent,
  buildTaskDeepenIntent,
  buildTaskFormationIntent,
  buildTaskUpdateIntent,
} from "@/lib/app/task-draft/taskDraftIntentText";

const MOJIBAKE_PATTERN = /[繧縺譁荳蜿邵蝨郢陷隴驛髫鬮隰闖]/u;

describe("taskDraftIntentText", () => {
  it("builds memory last-intent labels without mojibake", () => {
    const values = [
      buildTaskFormationIntent("Farmers 360 Link 再起動計画"),
      buildTaskUpdateIntent("Farmers 360 Link 再起動計画"),
      buildLatestGptTaskUpdateIntent("Farmers 360 Link 再起動計画"),
      buildTaskDeepenIntent("Farmers 360 Link 再起動計画"),
      buildLibraryTaskFormationIntent("日本起業戦略メモ"),
      buildLibraryTaskAttachIntent("日本起業戦略メモ"),
    ];

    expect(values).toEqual([
      "タスクを形成: Farmers 360 Link 再起動計画",
      "タスクを更新: Farmers 360 Link 再起動計画",
      "最新GPTレスからタスクを更新: Farmers 360 Link 再起動計画",
      "タスクを深掘り: Farmers 360 Link 再起動計画",
      "ライブラリ項目「日本起業戦略メモ」からタスクを形成",
      "ライブラリ項目「日本起業戦略メモ」をタスクに追加",
    ]);
    expect(values.join("\n")).not.toMatch(MOJIBAKE_PATTERN);
  });
});
