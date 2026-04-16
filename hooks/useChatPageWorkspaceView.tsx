"use client";

import { useChatPagePanelsView } from "@/hooks/useChatPagePanelsView";
import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPageCompositionTypes";
import { buildChatPageWorkspacePanelsViewArgs } from "@/hooks/chatPageWorkspaceViewBuilders";

export function useChatPageWorkspaceView(args: ChatPageWorkspaceViewArgs): {
  kinPanel: React.ReactElement;
  gptPanel: React.ReactElement;
} {
  return useChatPagePanelsView(buildChatPageWorkspacePanelsViewArgs(args));
}
