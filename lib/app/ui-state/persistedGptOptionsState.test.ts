import { describe, expect, it } from "vitest";
import {
  COMPACT_CHAR_LIMIT_KEY,
  AUTO_GENERATE_LIBRARY_SUMMARY_KEY,
  IMAGE_DETAIL_KEY,
  INGEST_MODE_KEY,
  LEGACY_DRIVE_IMPORT_AUTO_SUMMARY_KEY,
  SIMPLE_IMAGE_CHAR_LIMIT_KEY,
  loadPersistedGptOptionsState,
} from "@/lib/app/ui-state/persistedGptOptionsState";

function createStorage(values: Record<string, string | null>) {
  return {
    getItem(key: string) {
      return key in values ? values[key] : null;
    },
  };
}

describe("persistedGptOptionsState", () => {
  it("returns defaults when storage is unavailable", () => {
    expect(loadPersistedGptOptionsState(null)).toMatchObject({
      ingestMode: "detailed",
      imageDetail: "detailed",
      compactCharLimit: 500,
    });
  });

  it("migrates legacy ingest/detail mode values to current ingest options", () => {
    expect(
      loadPersistedGptOptionsState(
        createStorage({
          [INGEST_MODE_KEY]: "strict",
          [IMAGE_DETAIL_KEY]: "high",
        })
      )
    ).toMatchObject({
      ingestMode: "compact",
      imageDetail: "max",
    });
  });

  it("applies numeric limits only when they are valid", () => {
    expect(
      loadPersistedGptOptionsState(
        createStorage({
          [COMPACT_CHAR_LIMIT_KEY]: "640.9",
          [SIMPLE_IMAGE_CHAR_LIMIT_KEY]: "80",
        })
      )
    ).toMatchObject({
      compactCharLimit: 640,
      simpleImageCharLimit: 500,
    });
  });

  it("loads the library auto-summary toggle when persisted", () => {
    expect(
      loadPersistedGptOptionsState(
        createStorage({
          [AUTO_GENERATE_LIBRARY_SUMMARY_KEY]: "false",
        })
      )
    ).toMatchObject({
      autoGenerateLibrarySummary: false,
    });
  });

  it("loads the legacy Google Drive auto-summary toggle", () => {
    expect(
      loadPersistedGptOptionsState(
        createStorage({
          [LEGACY_DRIVE_IMPORT_AUTO_SUMMARY_KEY]: "false",
        })
      )
    ).toMatchObject({
      autoGenerateLibrarySummary: false,
    });
  });
});
