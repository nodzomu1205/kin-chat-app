import { describe, expect, it, vi } from "vitest";
import {
  buildPrepInputFromIngestResult,
  buildTaskApiRequestBody,
  resolveUploadKindFromFile,
} from "@/lib/app/gptTaskClientBuilders";

describe("gptTaskClient builders", () => {
  it("resolves upload kind from file metadata", () => {
    expect(
      resolveUploadKindFromFile(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
        "image"
      )
    ).toBe("text");

    expect(
      resolveUploadKindFromFile(
        new File(["img"], "photo.png", { type: "image/png" }),
        "text"
      )
    ).toBe("image");
  });

  it("builds prep input from ingest result", () => {
    const text = buildPrepInputFromIngestResult(
      {
        result: {
          title: "Napoleon",
          rawText: "[0:00] alpha\n[0:08] beta",
          kinCompact: ["short 1", "short 2"],
          kinDetailed: ["long 1", "long 2"],
        },
      },
      "notes.txt"
    );

    expect(text).toContain("File: notes.txt");
    expect(text).toContain("Title: Napoleon");
    expect(text).toContain("Content:\nalpha beta");
  });

  it("builds the task API request body", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));

    expect(
      buildTaskApiRequestBody({
        type: "PREP_TASK",
        goal: "goal",
        inputRef: "ref",
        inputSummary: "summary",
        constraints: ["a", "b"],
      })
    ).toEqual({
      task: {
        type: "PREP_TASK",
        taskId: "task-1776513600000",
        dataKind: "document_package",
        goal: "goal",
        inputRef: "ref",
        inputSummary: "summary",
        constraints: ["a", "b"],
        outputFormat: "sections",
        priority: "HIGH",
        visibility: "INTERNAL",
        responseMode: "STRUCTURED_RESULT",
      },
    });

    vi.useRealTimers();
  });

  it("keeps format-task titles optional and explicit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));

    expect(
      buildTaskApiRequestBody({
        type: "FORMAT_TASK",
        goal: "format",
        inputRef: "ref",
        inputSummary: "summary",
        constraints: ["a"],
        existingTitle: "Existing title",
      })
    ).toEqual({
      task: {
        type: "FORMAT_TASK",
        taskId: "task-1776513600000",
        dataKind: "document_package",
        goal: "format",
        inputRef: "ref",
        inputSummary: "summary",
        constraints: ["a"],
        outputFormat: "sections",
        priority: "HIGH",
        visibility: "INTERNAL",
        responseMode: "STRUCTURED_RESULT",
        existingTitle: "Existing title",
      },
    });

    vi.useRealTimers();
  });
});
