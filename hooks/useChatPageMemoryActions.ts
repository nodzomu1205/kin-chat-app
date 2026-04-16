"use client";

import type {
  ChatPageActionArgGroups,
  ChatPageActionGroups,
} from "@/hooks/chatPageActionTypes";

export function useChatPageMemoryActions(
  args: Pick<ChatPageActionArgGroups, "services">
): ChatPageActionGroups["memory"] {
  return {
    handleSaveMemorySettings:
      args.services.gptMemorySettingsControls.updateMemorySettings,
    handleResetMemorySettings:
      args.services.gptMemorySettingsControls.resetMemorySettings,
  };
}
