import { trimMemoryState, normalizeRecentMessagesState } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import type { Memory, MemorySettings } from "@/lib/memory";
import type { KinMemoryState } from "@/types/chat";

export function normalizeKinMemoryStateForSettings(
  state: Partial<KinMemoryState> | null | undefined,
  settings: MemorySettings
): KinMemoryState {
  return {
    memory: trimMemoryState((state?.memory as Memory) ?? {
      facts: [],
      preferences: [],
      lists: {},
      context: {},
    }, settings),
    recentMessages: normalizeRecentMessagesState(
      state?.recentMessages,
      settings.chatRecentLimit
    ),
  };
}
