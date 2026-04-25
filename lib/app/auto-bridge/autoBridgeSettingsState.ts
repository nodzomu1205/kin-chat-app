type StorageLike = Pick<Storage, "getItem"> | null;

export const AUTO_BRIDGE_SETTINGS_STORAGE_KEY = "auto_bridge_settings";

export type AutoBridgeSettings = {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
  autoCopyFileIngestSysInfoToKin: boolean;
};

export const DEFAULT_AUTO_BRIDGE_SETTINGS: AutoBridgeSettings = {
  autoSendKinSysInput: false,
  autoCopyKinSysResponseToGpt: false,
  autoSendGptSysInput: false,
  autoCopyGptSysResponseToKin: false,
  autoCopyFileIngestSysInfoToKin: true,
};

export function loadAutoBridgeSettings(
  storage: StorageLike
): AutoBridgeSettings {
  if (!storage) {
    return DEFAULT_AUTO_BRIDGE_SETTINGS;
  }

  const saved = storage.getItem(AUTO_BRIDGE_SETTINGS_STORAGE_KEY);
  if (!saved) return DEFAULT_AUTO_BRIDGE_SETTINGS;

  try {
    const parsed = JSON.parse(saved) as Partial<AutoBridgeSettings>;
    return {
      autoSendKinSysInput: !!parsed.autoSendKinSysInput,
      autoCopyKinSysResponseToGpt: !!parsed.autoCopyKinSysResponseToGpt,
      autoSendGptSysInput: !!parsed.autoSendGptSysInput,
      autoCopyGptSysResponseToKin: !!parsed.autoCopyGptSysResponseToKin,
      autoCopyFileIngestSysInfoToKin:
        parsed.autoCopyFileIngestSysInfoToKin !== false,
    };
  } catch {
    return DEFAULT_AUTO_BRIDGE_SETTINGS;
  }
}

export function mergeAutoBridgeSettings(
  current: AutoBridgeSettings,
  patch: Partial<AutoBridgeSettings>
): AutoBridgeSettings {
  return {
    ...current,
    ...patch,
  };
}
