import { describe, expect, it } from "vitest";
import {
  buildAttachCurrentTaskDraftUpdate,
  buildAttachCurrentTaskMergedInput,
  buildPostIngestTaskDraftUpdate,
} from "@/lib/app/ingestTaskDraftUpdates";

describe("ingestTaskDraftUpdates", () => {
  it("builds attach-current-task merged input through the shared helper", () => {
    const mergedInput = buildAttachCurrentTaskMergedInput({
      currentTaskText: "CURRENT TASK",
      fileName: "notes.txt",
      prepInput: "prep body",
      currentTaskDraft: {
        title: "Draft title",
        userInstruction: "Do this",
        searchContext: { rawText: "search raw" },
      } as never,
      fileTitle: "Notes",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
    });

    expect(mergedInput).toContain("CURRENT TASK");
    expect(mergedInput).toContain("FILE: notes.txt");
    expect(mergedInput).toContain("prep body");
  });

  it("builds attach-current-task draft updates with a custom objective fallback", () => {
    const nextDraft = buildAttachCurrentTaskDraftUpdate({
      previousDraft: {
        id: "draft-1",
        slot: 1,
        taskName: "",
        title: "",
        body: "",
        objective: "",
        prepText: "",
        deepenText: "",
        mergedText: "",
        kinTaskText: "",
        status: "idle",
        sources: [],
        userInstruction: "",
        updatedAt: "",
      } as never,
      fileName: "notes.txt",
      fileTitle: "Notes",
      prepInput: "prep body",
      mergedTaskText: "merged task text",
      resolveTaskTitleFromDraft: (_draft, { explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
      objectiveFallback: "custom objective",
    });

    expect(nextDraft.title).toBe("Notes");
    expect(nextDraft.body).toBe("merged task text");
    expect(nextDraft.objective).toBe("custom objective");
    expect(nextDraft.sources).toHaveLength(1);
  });

  it("builds prepared/deepened ingest draft updates with a custom objective builder", () => {
    const nextDraft = buildPostIngestTaskDraftUpdate({
      previousDraft: {
        id: "draft-1",
        slot: 1,
        taskName: "",
        title: "",
        body: "",
        objective: "",
        prepText: "",
        deepenText: "",
        mergedText: "",
        kinTaskText: "",
        status: "idle",
        sources: [],
        userInstruction: "",
        updatedAt: "",
      } as never,
      action: "inject_prep_deepen",
      fileName: "notes.txt",
      fileTitle: "Notes",
      prepInput: "prep body",
      prepTaskText: "prepared task text",
      deepenTaskText: "deepened task text",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
      objectiveBuilder: (fileName) => `from ${fileName}`,
    });

    expect(nextDraft.title).toBe("Notes");
    expect(nextDraft.body).toBe("deepened task text");
    expect(nextDraft.objective).toBe("from notes.txt");
    expect(nextDraft.status).toBe("deepened");
  });
});
