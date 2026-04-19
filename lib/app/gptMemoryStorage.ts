import { createEmptyKinMemoryState } from "@/lib/app/gptMemoryCore";
import type { MemorySettings } from "@/lib/memory";
import {
  clearTaskScopedMemory,
  normalizeMemorySettings,
} from "@/lib/memory";
import { normalizeKinMemoryStateForSettings } from "@/lib/app/gptMemoryPersistence";
import type { KinMemoryState } from "@/types/chat";

export const KIN_MEMORY_MAP_KEY = "kin_memory_map";
export const MEMORY_SETTINGS_KEY = "gpt_memory_settings";

export function loadMemorySettingsFromStorage() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(MEMORY_SETTINGS_KEY);
  if (!saved) return null;

  try {
    return normalizeMemorySettings(JSON.parse(saved));
  } catch {
    console.warn("memory settings parse failed");
    return null;
  }
}

export function saveMemorySettingsToStorage(settings: MemorySettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMORY_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadKinMemoryMapFromStorage(settings: MemorySettings) {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(KIN_MEMORY_MAP_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as Record<string, KinMemoryState>;
    const normalized: Record<string, KinMemoryState> = {};

    Object.entries(parsed).forEach(([key, value]) => {
      normalized[key] = normalizeKinMemoryStateForSettings(value, settings);
    });

    return normalized;
  } catch {
    console.warn("kin_memory_map parse failed");
    return null;
  }
}

export function saveKinMemoryMapToStorage(kinMemoryMap: Record<string, KinMemoryState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KIN_MEMORY_MAP_KEY, JSON.stringify(kinMemoryMap));
}

export function resolveCurrentKinState(
  currentKin: string | null,
  kinMemoryMap: Record<string, KinMemoryState>,
  settings: MemorySettings
) {
  if (!currentKin) {
    return createEmptyKinMemoryState();
  }

  const saved = kinMemoryMap[currentKin] ?? createEmptyKinMemoryState();
  return normalizeKinMemoryStateForSettings(saved, settings);
}

export function clearTaskScopedMemoryState(state: KinMemoryState): KinMemoryState {
  return {
    ...state,
    memory: clearTaskScopedMemory(state.memory),
  };
}
