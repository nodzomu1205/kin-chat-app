import { describe, expect, it } from "vitest";
import {
  buildRemovedSearchContextDraft,
  buildTaskDraftFromPrefixedText,
  buildUpdatedTaskDraft,
  resolveCurrentTaskCharConstraint,
  resolveTaskBaseText,
  resolveTaskTitle,
} from "@/lib/app/taskDraftActionBuilders";

describe("taskDraftActionBuilders", () => {
  it("removes matching search context only for the targeted raw result", () => {
    expect(
      buildRemovedSearchContextDraft(
        {
          title: "Draft",
          searchContext: { rawResultId: "RAW-1" },
        } as never,
        "RAW-1",
        "2026-04-18T00:00:00.000Z"
      )
    ).toMatchObject({
      searchContext: null,
      updatedAt: "2026-04-18T00:00:00.000Z",
    });
  });

  it("resolves current-task character constraints from intent strings", () => {
    expect(
      resolveCurrentTaskCharConstraint([
        "exactly 400 Japanese characters",
      ])
    ).toEqual({ rule: "exact", limit: 400 });
  });

  it("builds draft patches and prefixed-task updates through shared helpers", () => {
    expect(
      buildUpdatedTaskDraft(
        { title: "Before", body: "", mergedText: "", deepenText: "", prepText: "" } as never,
        { title: "After" },
        "2026-04-18T00:00:00.000Z"
      )
    ).toMatchObject({
      title: "After",
      updatedAt: "2026-04-18T00:00:00.000Z",
    });

    const result = buildTaskDraftFromPrefixedText(
      {
        title: "Before",
        taskName: "Before",
        userInstruction: "",
      } as never,
      "TITLE: After\nINSTRUCTION: Do this",
      "2026-04-18T00:00:00.000Z"
    );

    expect(result.parsed).toMatchObject({
      title: "After",
      userInstruction: "Do this",
    });
    expect(result.draft).toMatchObject({
      title: "After",
      taskName: "After",
      userInstruction: "Do this",
      updatedAt: "2026-04-18T00:00:00.000Z",
    });
  });

  it("resolves titles and base text from the shared draft helpers", () => {
    const draft = {
      title: "Current title",
      body: "",
      mergedText: "Merged text",
      deepenText: "",
      prepText: "",
    } as never;

    expect(
      resolveTaskTitle(draft, {
        explicitTitle: "Explicit title",
      })
    ).toBe("Explicit title");
    expect(resolveTaskBaseText(draft)).toBe("Merged text");
  });
});
