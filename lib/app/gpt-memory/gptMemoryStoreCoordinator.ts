import { DEFAULT_MEMORY_SETTINGS, type MemorySettings } from "@/lib/memory";
import {
  clearTaskScopedMemoryState,
  loadKinMemoryMapFromStorage,
  loadMemorySettingsFromStorage,
  resolveCurrentKinState,
  saveKinMemoryMapToStorage,
  saveMemorySettingsToStorage,
} from "@/lib/app/gpt-memory/gptMemoryStorage";
import {
  ensureKinMemoryMapState,
  normalizeNextMemorySettings,
  removeKinMemoryMapState,
  upsertKinMemoryMapState,
} from "@/lib/app/gpt-memory/gptMemoryRegistry";
import type { KinMemoryState } from "@/types/chat";

export function loadStoredGptMemorySettings() {
  return loadMemorySettingsFromStorage() ?? DEFAULT_MEMORY_SETTINGS;
}

export function persistStoredGptMemorySettings(settings: MemorySettings) {
  saveMemorySettingsToStorage(settings);
}

export function loadStoredKinMemoryMap(settings: MemorySettings) {
  return loadKinMemoryMapFromStorage(settings) ?? {};
}

export function persistStoredKinMemoryMap(
  kinMemoryMap: Record<string, KinMemoryState>
) {
  saveKinMemoryMapToStorage(kinMemoryMap);
}

export function resolveActiveKinMemoryState(
  currentKin: string | null,
  kinMemoryMap: Record<string, KinMemoryState>,
  settings: MemorySettings
) {
  return resolveCurrentKinState(currentKin, kinMemoryMap, settings);
}

export function upsertStoredKinMemoryState(params: {
  prev: Record<string, KinMemoryState>;
  kin: string | null;
  state: KinMemoryState;
  settings: MemorySettings;
}) {
  return upsertKinMemoryMapState(params);
}

export function removeStoredKinMemoryState(
  prev: Record<string, KinMemoryState>,
  kin: string
) {
  return removeKinMemoryMapState(prev, kin);
}

export function ensureStoredKinMemoryState(params: {
  prev: Record<string, KinMemoryState>;
  kin: string | null;
  settings: MemorySettings;
}) {
  return ensureKinMemoryMapState(params);
}

export function normalizeUpdatedMemorySettings(next: MemorySettings) {
  return normalizeNextMemorySettings(next);
}

export { clearTaskScopedMemoryState };
