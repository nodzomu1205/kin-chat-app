"use client";

import type {
  ChatPageActionGroups,
  UseChatPageActionsArgs,
} from "@/hooks/chatPageActionTypes";

export function useChatPageMemoryActions(
  args: Pick<UseChatPageActionsArgs, "gptMemorySettingsControls">
): ChatPageActionGroups["memory"] {
  return {
    handleSaveMemorySettings: args.gptMemorySettingsControls.updateMemorySettings,
    handleResetMemorySettings: args.gptMemorySettingsControls.resetMemorySettings,
  };
}
