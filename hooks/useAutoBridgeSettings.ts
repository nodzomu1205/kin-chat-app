import { useEffect, useState } from "react";
import {
  AUTO_BRIDGE_SETTINGS_STORAGE_KEY,
  loadAutoBridgeSettings,
  mergeAutoBridgeSettings,
  type AutoBridgeSettings,
} from "@/lib/app/auto-bridge/autoBridgeSettingsState";

export type { AutoBridgeSettings } from "@/lib/app/auto-bridge/autoBridgeSettingsState";

export function useAutoBridgeSettings() {
  const [autoBridgeSettings, setAutoBridgeSettings] =
    useState<AutoBridgeSettings>(() =>
      loadAutoBridgeSettings(
        typeof window === "undefined" ? null : window.localStorage
      )
    );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      AUTO_BRIDGE_SETTINGS_STORAGE_KEY,
      JSON.stringify(autoBridgeSettings)
    );
  }, [autoBridgeSettings]);

  const updateAutoBridgeSettings = (patch: Partial<AutoBridgeSettings>) => {
    setAutoBridgeSettings((prev) => mergeAutoBridgeSettings(prev, patch));
  };

  return {
    autoBridgeSettings,
    updateAutoBridgeSettings,
  };
}
