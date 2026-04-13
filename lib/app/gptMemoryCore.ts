import { createEmptyMemory } from "@/lib/memory";
import type { KinMemoryState } from "@/types/chat";

export function createEmptyKinMemoryState(): KinMemoryState {
  return {
    memory: createEmptyMemory(),
    recentMessages: [],
  };
}

export function normalizeMemoryTextValue(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}
