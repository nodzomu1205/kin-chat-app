import { describe, expect, it } from "vitest";
import {
  buildRegisteredTask,
  canRegisterTaskDraft,
  createDefaultTaskRegistrationLibrarySettings,
  createDefaultTaskRegistrationRecurrence,
  normalizeTaskRegistrationLibraryCountInput,
  removeRegisteredTask,
  updateRegisteredTask,
} from "@/lib/app/task-registration/taskRegistration";
import { createEmptyTaskDraft } from "@/types/task";

describe("taskRegistration", () => {
  it("builds multiple registered tasks and removes one by id", () => {
    const draft = {
      ...createEmptyTaskDraft(),
      title: "Business plan",
      userInstruction: "Create the latest business plan.",
      kinTaskText: "<<SYS_TASK>>\nGOAL: plan\n<<END_SYS_TASK>>",
    };
    const first = buildRegisteredTask({
      draft,
      librarySettings: createDefaultTaskRegistrationLibrarySettings(),
      recurrence: createDefaultTaskRegistrationRecurrence(),
      now: "2026-04-27T00:00:00.000Z",
    });
    const second = buildRegisteredTask({
      draft: { ...draft, userInstruction: "Second task" },
      librarySettings: createDefaultTaskRegistrationLibrarySettings(),
      recurrence: createDefaultTaskRegistrationRecurrence(),
      now: "2026-04-27T01:00:00.000Z",
    });

    expect(canRegisterTaskDraft(draft)).toBe(true);
    expect([first, second]).toHaveLength(2);
    expect(removeRegisteredTask([first, second], first.id)).toEqual([second]);
  });

  it("overwrites a registered task while keeping the same task id", () => {
    const original = buildRegisteredTask({
      draft: {
        ...createEmptyTaskDraft(),
        userInstruction: "Original task",
        kinTaskText: "<<SYS_TASK>>\nGOAL: original\n<<END_SYS_TASK>>",
      },
      librarySettings: createDefaultTaskRegistrationLibrarySettings(),
      recurrence: createDefaultTaskRegistrationRecurrence(),
      now: "2026-04-27T00:00:00.000Z",
    });

    const updated = updateRegisteredTask(original, {
      draft: {
        ...createEmptyTaskDraft(),
        userInstruction: "Updated task",
        kinTaskText: "<<SYS_TASK>>\nGOAL: updated\n<<END_SYS_TASK>>",
      },
      librarySettings: {
        ...createDefaultTaskRegistrationLibrarySettings(),
        enabled: false,
      },
      recurrence: {
        mode: "repeat",
        weekdays: ["月", "水"],
        times: ["09:00", "17:00"],
      },
      now: "2026-04-27T02:00:00.000Z",
    });

    expect(updated.id).toBe(original.id);
    expect(updated.originalInstruction).toBe("Updated task");
    expect(updated.librarySettings.enabled).toBe(false);
    expect(updated.recurrence.times).toEqual(["09:00", "17:00"]);
  });

  it("normalizes library count input while preserving blank in-progress edits", () => {
    expect(normalizeTaskRegistrationLibraryCountInput("")).toEqual({
      displayValue: "",
      count: null,
    });
    expect(normalizeTaskRegistrationLibraryCountInput("7")).toEqual({
      displayValue: "7",
      count: 7,
    });
    expect(normalizeTaskRegistrationLibraryCountInput("09")).toEqual({
      displayValue: "09",
      count: 9,
    });
    expect(normalizeTaskRegistrationLibraryCountInput("123")).toEqual({
      displayValue: "123",
      count: 50,
    });
    expect(normalizeTaskRegistrationLibraryCountInput("1件")).toEqual({
      displayValue: "1",
      count: 1,
    });
  });
});
