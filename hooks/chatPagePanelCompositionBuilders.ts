import type { ChatPageControllerGroups } from "@/hooks/useChatPageController";
import type {
  ChatPageGptPanelCompositionArgs,
  ChatPageKinPanelCompositionArgs,
  ChatPageWorkspaceViewArgs,
} from "@/hooks/chatPagePanelCompositionTypes";
import {
  buildChatPagePanelBaseArgs,
  buildChatPageWorkspaceGptReferences,
  buildChatPageWorkspaceGptSettings,
  buildChatPageWorkspaceGptState,
  buildChatPageWorkspaceGptTask,
  buildChatPageWorkspaceKinState,
  buildChatPageWorkspaceMemoryState,
  buildChatPageWorkspaceProtocolState,
} from "@/hooks/chatPagePanelSectionBuilders";

type BuildChatPageWorkspaceGptPanelArgsOptions = {
  controller: ChatPageControllerGroups;
  onSaveTaskSnapshot: () => void;
};

export function buildChatPageWorkspaceKinPanelArgs(
  args: ChatPageWorkspaceViewArgs,
  controller: ChatPageControllerGroups
): ChatPageKinPanelCompositionArgs {
  return {
    ...buildChatPagePanelBaseArgs(args, controller),
    onSwitchToGptPanel: args.app.focusGptPanel,
    kinState: buildChatPageWorkspaceKinState(args),
  };
}

export function buildChatPageWorkspaceGptPanelArgs(
  args: ChatPageWorkspaceViewArgs,
  options: BuildChatPageWorkspaceGptPanelArgsOptions
): ChatPageGptPanelCompositionArgs {
  return {
    ...buildChatPagePanelBaseArgs(args, options.controller),
    onSwitchToKinPanel: args.app.focusKinPanel,
    pendingInjection: {
      blocks: args.ui.pendingKinInjectionBlocks,
      index: args.ui.pendingKinInjectionIndex,
    },
    gptState: buildChatPageWorkspaceGptState(args),
    task: buildChatPageWorkspaceGptTask({
      workspace: args,
      onSaveTaskSnapshot: options.onSaveTaskSnapshot,
    }),
    references: buildChatPageWorkspaceGptReferences(args),
    settings: buildChatPageWorkspaceGptSettings(args),
    protocolState: buildChatPageWorkspaceProtocolState(args),
    memoryState: buildChatPageWorkspaceMemoryState(args),
  };
}

export {
  buildChatPageTaskSnapshotDocument,
  saveChatPageTaskSnapshot,
} from "@/hooks/chatPageTaskSnapshot";
