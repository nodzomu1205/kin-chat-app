import { describe, expect, it } from "vitest";
import {
  applyLocalSettingsUpdate,
  buildLocalSettingsSourceKey,
  getComposerPlaceholder,
  resolveFloatingLabel,
  resolveLocalSettingsState,
  toLocalSettings,
} from "@/components/panels/gpt/gptPanelHelpers";
import { createEmptyTaskDraft } from "@/types/task";

describe("resolveFloatingLabel", () => {
  it("does not keep showing the last user message when memory topic is empty", () => {
    const label = resolveFloatingLabel({
      activeDrawer: null,
      bottomTab: "chat",
      currentTaskDraft: createEmptyTaskDraft(),
      currentTopic: "",
    });

    expect(label.value).toBe("");
  });

  it("shows the current memory topic on the chat view", () => {
    const label = resolveFloatingLabel({
      activeDrawer: null,
      bottomTab: "chat",
      currentTaskDraft: createEmptyTaskDraft(),
      currentTopic: "Japanese history",
    });

    expect(label.kind).toBe("トピック");
    expect(label.value).toBe("Japanese history");
  });

  it("does not use memory currentTask as a task-tab fallback", () => {
    const label = resolveFloatingLabel({
      activeDrawer: null,
      bottomTab: "task_secondary",
      currentTaskDraft: createEmptyTaskDraft(),
      currentTopic: "Modern literature",
    });

    expect(label.kind).toBe("トピック");
    expect(label.value).toBe("Modern literature");
  });
});

describe("composer placeholder", () => {
  it("returns stable placeholder text for each tab", () => {
    expect(getComposerPlaceholder("chat")).toBe("メッセージを入力");
    expect(getComposerPlaceholder("kin")).toContain("Kin");
  });
});

describe("local settings helpers", () => {
  const sourceSettings = toLocalSettings({
    memorySettings: {
      maxFacts: 12,
      maxPreferences: 8,
      chatRecentLimit: 6,
      summarizeThreshold: 20,
      recentKeep: 4,
    },
    defaultMemorySettings: {
      maxFacts: 10,
      maxPreferences: 6,
      chatRecentLimit: 5,
      summarizeThreshold: 18,
      recentKeep: 3,
    },
  });

  it("builds a stable source key from kin and memory settings", () => {
    expect(
      buildLocalSettingsSourceKey({
        currentKin: "kin-a",
        memorySettings: {
          maxFacts: 12,
          maxPreferences: 8,
          chatRecentLimit: 6,
          summarizeThreshold: 20,
          recentKeep: 4,
        },
        defaultMemorySettings: {
          maxFacts: 10,
          maxPreferences: 6,
          chatRecentLimit: 5,
          summarizeThreshold: 18,
          recentKeep: 3,
        },
      })
    ).toContain("\"currentKin\":\"kin-a\"");
  });

  it("falls back to source settings when the upstream source changes", () => {
    expect(
      resolveLocalSettingsState({
        localSettingsState: {
          ...sourceSettings,
          maxFacts: "99",
        },
        localSettingsSourceKey: "kin-a",
        settingsSourceKey: "kin-b",
        sourceLocalSettings: sourceSettings,
      })
    ).toEqual(sourceSettings);
  });

  it("applies a local update against the new source after a source switch", () => {
    expect(
      applyLocalSettingsUpdate({
        value: (prev) => ({
          ...prev,
          maxFacts: String(Number(prev.maxFacts) + 1),
        }),
        localSettingsState: {
          ...sourceSettings,
          maxFacts: "99",
        },
        localSettingsSourceKey: "kin-a",
        settingsSourceKey: "kin-b",
        sourceLocalSettings: sourceSettings,
      })
    ).toEqual({
      ...sourceSettings,
      maxFacts: "13",
    });
  });
});


