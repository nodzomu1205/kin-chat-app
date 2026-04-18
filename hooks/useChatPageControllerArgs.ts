"use client";

import type { UseChatPageControllerArgs } from "@/hooks/useChatPageController";
import { 
  buildChatPageControllerIdentityArgs,
  buildChatPageControllerProtocolArgs,
  buildChatPageControllerSearchArgs,
  buildChatPageControllerServicesArgs,
  buildChatPageControllerTaskArgs,
  buildChatPageControllerUiStateArgs,
  buildChatPagePanelResetArgs,
  buildChatPageProtocolAutomationArgs,
} from "@/hooks/chatPageControllerArgBuilders";
import type { ChatPageActionArgGroups } from "@/hooks/chatPageActionTypes";
import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";

export function useChatPageControllerArgs(
  args: ChatPageWorkspaceViewArgs
): UseChatPageControllerArgs {
  const identity = buildChatPageControllerIdentityArgs(args);
  const uiState = buildChatPageControllerUiStateArgs(args);
  const task = buildChatPageControllerTaskArgs(args);
  const protocol = buildChatPageControllerProtocolArgs(args);
  const search = buildChatPageControllerSearchArgs(args);
  const services = buildChatPageControllerServicesArgs(args);
  const actions: ChatPageActionArgGroups = {
    identity,
    uiState,
    task,
    protocol,
    search,
    services,
  };

  return {
    actions,
    protocolAutomation: buildChatPageProtocolAutomationArgs(args),
    panelReset: buildChatPagePanelResetArgs(args),
  };
}
