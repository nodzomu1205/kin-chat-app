import { describe, expect, it } from "vitest";
import { resolveDraftTitle, suggestTaskTitle } from "@/lib/app/contextNaming";
import { createEmptyTaskDraft } from "@/types/task";

describe("contextNaming", () => {
  it("prefers explicit task titles", () => {
    expect(
      suggestTaskTitle({
        explicitTitle: "Explicit title",
        freeText: "User comment that should not become a title",
        fallback: "Fallback title",
      })
    ).toBe("Explicit title");
  });

  it("uses search queries when no explicit title is given", () => {
    expect(
      suggestTaskTitle({
        searchQuery: "Rival analysis",
        freeText: "User comment that should not become a title",
        fallback: "Fallback title",
      })
    ).toBe("Rival analysis");
  });

  it("falls back instead of inferring from free text", () => {
    expect(
      suggestTaskTitle({
        freeText: "Please analyze this long user comment in detail",
        fallback: "Fallback title",
      })
    ).toBe("Fallback title");
  });

  it("keeps the existing draft title when no explicit title exists", () => {
    expect(
      resolveDraftTitle(
        {
          ...createEmptyTaskDraft(),
          title: "Existing task",
          taskName: "Existing task",
        },
        {
          freeText: "Please analyze this long user comment in detail",
        }
      )
    ).toBe("Existing task");
  });
});
