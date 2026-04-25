import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTO_BRIDGE_SETTINGS,
  loadAutoBridgeSettings,
  mergeAutoBridgeSettings,
} from "@/lib/app/auto-bridge/autoBridgeSettingsState";

function createStorage(values: Record<string, string | null>) {
  return {
    getItem(key: string) {
      return key in values ? values[key] : null;
    },
  };
}

describe("autoBridgeSettingsState", () => {
  it("returns defaults when storage is unavailable or missing", () => {
    expect(loadAutoBridgeSettings(null)).toEqual(DEFAULT_AUTO_BRIDGE_SETTINGS);
    expect(loadAutoBridgeSettings(createStorage({}))).toEqual(
      DEFAULT_AUTO_BRIDGE_SETTINGS
    );
  });

  it("keeps the file-ingest bridge enabled unless explicitly set to false", () => {
    expect(
      loadAutoBridgeSettings(
        createStorage({
          auto_bridge_settings: JSON.stringify({
            autoSendKinSysInput: true,
          }),
        })
      )
    ).toMatchObject({
      autoSendKinSysInput: true,
      autoCopyFileIngestSysInfoToKin: true,
    });
  });

  it("merges patches onto the current settings", () => {
    expect(
      mergeAutoBridgeSettings(DEFAULT_AUTO_BRIDGE_SETTINGS, {
        autoSendGptSysInput: true,
      })
    ).toMatchObject({
      autoSendGptSysInput: true,
      autoCopyFileIngestSysInfoToKin: true,
    });
  });
});
