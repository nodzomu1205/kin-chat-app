import { describe, expect, it } from "vitest";
import {
  buildDeepenedTaskDraftUpdate,
  buildLibraryTaskSource,
  buildPreparedTaskDraftUpdate,
} from "@/lib/app/task-draft/taskDraftFlowProjection";
import type { TaskDraft } from "@/types/task";

function createDraft(): TaskDraft {
  return {
    id: "draft-1",
    slot: 1,
    taskId: "",
    title: "Current task",
    taskName: "Current task",
    userInstruction: "keep instruction",
    body: "body",
    prepText: "existing prep",
    deepenText: "existing deepen",
    mergedText: "existing merged",
    kinTaskText: "existing kin",
    objective: "existing objective",
    status: "prepared",
    searchContext: null,
    sources: [],
    updatedAt: "2026-04-17T00:00:00.000Z",
  };
}

describe("taskDraftFlowProjection", () => {
  it("builds a prepared draft update while preserving previous prep text when requested", () => {
    const updated = buildPreparedTaskDraftUpdate(createDraft(), {
      title: "Updated task",
      body: "next body",
      preservePrepText: true,
    });

    expect(updated.title).toBe("Updated task");
    expect(updated.taskName).toBe("Updated task");
    expect(updated.body).toBe("next body");
    expect(updated.prepText).toBe("existing prep");
    expect(updated.deepenText).toBe("");
    expect(updated.mergedText).toBe("next body");
    expect(updated.kinTaskText).toBe("");
    expect(updated.status).toBe("prepared");
  });

  it("builds a deepened draft update without disturbing the user instruction fallback", () => {
    const updated = buildDeepenedTaskDraftUpdate(createDraft(), {
      title: "Deepened task",
      body: "deepened body",
    });

    expect(updated.title).toBe("Deepened task");
    expect(updated.taskName).toBe("Deepened task");
    expect(updated.userInstruction).toBe("keep instruction");
    expect(updated.deepenText).toBe("deepened body");
    expect(updated.mergedText).toBe("deepened body");
    expect(updated.status).toBe("deepened");
  });

  it("builds a library task source from search items with the search query fallback", () => {
    const source = buildLibraryTaskSource({
      taskLibraryItem: {
        id: "library:1",
        sourceId: "1",
        itemType: "search",
        title: "",
        subtitle: "",
        summary: "",
        excerptText: "excerpt",
        rawResultId: "search-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      taskSearchContext: {
        rawResultId: "search-1",
        query: "farmers 360",
        rawText: "raw",
        sources: [],
        createdAt: new Date().toISOString(),
      },
      materialText: "material",
    });

    expect(source.type).toBe("web_search");
    expect(source.label).toContain("farmers 360");
    expect(source.content).toBe("material");
  });
});
