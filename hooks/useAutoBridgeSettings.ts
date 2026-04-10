import { useEffect, useState } from "react";

export type AutoBridgeSettings = {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
};

const STORAGE_KEY = "auto_bridge_settings";

const DEFAULT_SETTINGS: AutoBridgeSettings = {
  autoSendKinSysInput: false,
  autoCopyKinSysResponseToGpt: false,
  autoSendGptSysInput: false,
  autoCopyGptSysResponseToKin: false,
};

export function useAutoBridgeSettings() {
  const [autoBridgeSettings, setAutoBridgeSettings] =
    useState<AutoBridgeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<AutoBridgeSettings>;
      setAutoBridgeSettings({
        autoSendKinSysInput: !!parsed.autoSendKinSysInput,
        autoCopyKinSysResponseToGpt: !!parsed.autoCopyKinSysResponseToGpt,
        autoSendGptSysInput: !!parsed.autoSendGptSysInput,
        autoCopyGptSysResponseToKin: !!parsed.autoCopyGptSysResponseToKin,
      });
    } catch {
      setAutoBridgeSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(autoBridgeSettings));
  }, [autoBridgeSettings]);

  const updateAutoBridgeSettings = (patch: Partial<AutoBridgeSettings>) => {
    setAutoBridgeSettings((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  return {
    autoBridgeSettings,
    updateAutoBridgeSettings,
  };
}
