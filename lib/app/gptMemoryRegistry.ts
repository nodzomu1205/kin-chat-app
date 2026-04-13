import { createEmptyKinMemoryState } from "@/lib/app/gptMemoryCore";
import { normalizeMemorySettings, type MemorySettings } from "@/lib/memory";
import { normalizeKinMemoryStateForSettings } from "@/lib/app/gptMemoryPersistence";
import type { KinMemoryState } from "@/types/chat";

export function upsertKinMemoryMapState(params: {
  prev: Record<string, KinMemoryState>;
  kin: string | null;
  state: KinMemoryState;
  settings: MemorySettings;
}) {
  if (!params.kin) return params.prev;

  return {
    ...params.prev,
    [params.kin]: normalizeKinMemoryStateForSettings(params.state, params.settings),
  };
}

export function removeKinMemoryMapState(
  prev: Record<string, KinMemoryState>,
  kin: string
) {
  const next = { ...prev };
  delete next[kin];
  return next;
}

export function ensureKinMemoryMapState(params: {
  prev: Record<string, KinMemoryState>;
  kin: string | null;
  settings: MemorySettings;
}) {
  if (!params.kin || params.prev[params.kin]) return params.prev;

  return upsertKinMemoryMapState({
    prev: params.prev,
    kin: params.kin,
    state: createEmptyKinMemoryState(),
    settings: params.settings,
  });
}

export function normalizeNextMemorySettings(next: MemorySettings) {
  return normalizeMemorySettings(next);
}
