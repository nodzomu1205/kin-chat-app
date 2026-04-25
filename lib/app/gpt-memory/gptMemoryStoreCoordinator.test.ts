import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import {
  ensureStoredKinMemoryState,
  loadStoredGptMemorySettings,
  loadStoredKinMemoryMap,
  normalizeUpdatedMemorySettings,
  removeStoredKinMemoryState,
  resolveActiveKinMemoryState,
  upsertStoredKinMemoryState,
} from "@/lib/app/gpt-memory/gptMemoryStoreCoordinator";

vi.mock("@/lib/app/gpt-memory/gptMemoryStorage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/app/gpt-memory/gptMemoryStorage")>(
    "@/lib/app/gpt-memory/gptMemoryStorage"
  );
  return {
    ...actual,
    loadMemorySettingsFromStorage: vi.fn(),
    loadKinMemoryMapFromStorage: vi.fn(),
  };
});

const storageModule = await import("@/lib/app/gpt-memory/gptMemoryStorage");

describe("gptMemoryStoreCoordinator", () => {
  it("falls back to default settings when storage is empty", () => {
    vi.mocked(storageModule.loadMemorySettingsFromStorage).mockReturnValueOnce(null);

    expect(loadStoredGptMemorySettings()).toEqual(DEFAULT_MEMORY_SETTINGS);
  });

  it("falls back to an empty kin memory map when storage is empty", () => {
    vi.mocked(storageModule.loadKinMemoryMapFromStorage).mockReturnValueOnce(null);

    expect(loadStoredKinMemoryMap(DEFAULT_MEMORY_SETTINGS)).toEqual({});
  });

  it("delegates current kin resolution through storage normalization", () => {
    const state = resolveActiveKinMemoryState(
      "kin-1",
      {
        "kin-1": {
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: { currentTopic: " Topic A " },
          },
          recentMessages: [],
        },
      },
      DEFAULT_MEMORY_SETTINGS
    );

    expect(state.memory.context.currentTopic).toBe("Topic A");
  });

  it("upserts, removes, and ensures kin state entries", () => {
    const upserted = upsertStoredKinMemoryState({
      prev: {},
      kin: "kin-1",
      state: {
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: { currentTopic: " Topic A " },
        },
        recentMessages: [],
      },
      settings: DEFAULT_MEMORY_SETTINGS,
    });

    expect(upserted["kin-1"].memory.context.currentTopic).toBe("Topic A");

    const removed = removeStoredKinMemoryState(upserted, "kin-1");
    expect(removed).toEqual({});

    const ensured = ensureStoredKinMemoryState({
      prev: {},
      kin: "kin-2",
      settings: DEFAULT_MEMORY_SETTINGS,
    });
    expect(ensured["kin-2"]).toBeTruthy();
  });

  it("normalizes updated settings", () => {
    expect(
      normalizeUpdatedMemorySettings({
        ...DEFAULT_MEMORY_SETTINGS,
        chatRecentLimit: 1.2,
      }).chatRecentLimit
    ).toBe(2);
  });
});
