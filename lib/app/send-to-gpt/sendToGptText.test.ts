import { describe, expect, it } from "vitest";
import {
  buildNormalizedRequestText,
  getTaskDirectiveOnlyResponseText,
  shouldRespondToTaskDirectiveOnlyInput,
} from "@/lib/app/send-to-gpt/sendToGptText";

describe("sendToGptText", () => {
  it("builds normalized request text from the resolved search query", () => {
    expect(
      buildNormalizedRequestText({
        rawText: "raw input",
        parsedInput: {
          searchQuery: "older query",
          freeText: "body text",
        },
        effectiveParsedSearchQuery: "newer query",
      })
    ).toBe("検索: newer query\nbody text");
  });

  it("returns raw input when no normalized fields are present", () => {
    expect(
      buildNormalizedRequestText({
        rawText: "raw input",
        parsedInput: {},
        effectiveParsedSearchQuery: "",
      })
    ).toBe("raw input");
  });

  it("detects task-directive-only input", () => {
    expect(
      shouldRespondToTaskDirectiveOnlyInput({
        parsedInput: {
          title: "調査タスク",
          userInstruction: "要点だけ整理",
          freeText: "",
        },
        effectiveParsedSearchQuery: "",
      })
    ).toBe(true);
  });

  it("returns the utf-8 task info message", () => {
    expect(getTaskDirectiveOnlyResponseText()).toBe(
      "タスクのタイトルと指示を更新しました。"
    );
  });
});
