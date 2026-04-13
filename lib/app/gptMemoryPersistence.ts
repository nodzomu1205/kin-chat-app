import { interpretProvisionalMemoryContext } from "@/lib/app/memoryInterpreter";
import { trimMemoryState, normalizeRecentMessagesState } from "@/lib/app/gptMemoryStateHelpers";
import type { Memory, MemorySettings } from "@/lib/memory";
import type { KinMemoryState } from "@/types/chat";

export type ProvisionalMemoryOptions = {
  currentTaskTitle?: string;
  activeDocumentTitle?: string;
  lastSearchQuery?: string;
};

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

export function buildProvisionalMemoryState(params: {
  inputText: string;
  currentMemory: Memory;
  settings: MemorySettings;
  options?: ProvisionalMemoryOptions;
}): Memory {
  const { inputText, currentMemory, settings, options } = params;

  const nextMemory: Memory = {
    ...currentMemory,
    context: {
      ...interpretProvisionalMemoryContext({
        inputText,
        currentMemory,
        currentTaskTitle: options?.currentTaskTitle,
        activeDocumentTitle: options?.activeDocumentTitle,
        lastSearchQuery: options?.lastSearchQuery,
      }),
    },
  };

  return trimMemoryState(nextMemory, settings);
}
