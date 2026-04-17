"use client";

import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import {
  useChatPageController,
  type ChatPageControllerGroups,
} from "@/hooks/useChatPageController";
import { buildChatPageWorkspaceControllerArgs } from "@/hooks/chatPageControllerCompositionBuilders";
import {
  buildChatPageTaskSnapshotDocument,
  buildChatPageWorkspaceGptPanelArgs,
  buildChatPageWorkspaceKinPanelArgs,
} from "@/hooks/chatPagePanelCompositionBuilders";
import { useChatPageControllerArgs } from "@/hooks/useChatPageControllerArgs";
import { useChatPageGptPanelArgs } from "@/hooks/useChatPageGptPanelArgs";
import { useChatPageKinPanelProps } from "@/hooks/useChatPageKinPanelProps";
import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";
import { buildGptPanelProps } from "@/lib/app/panelPropsBuilders";

export function useChatPagePanelsComposition(
  args: ChatPageWorkspaceViewArgs
): {
  controller: ChatPageControllerGroups;
  kinPanel: React.ReactElement;
  gptPanel: React.ReactElement;
} {
  const controller = useChatPageController(
    useChatPageControllerArgs(buildChatPageWorkspaceControllerArgs(args))
  );
  const handleSaveTaskSnapshot = () => {
    const nextDocument = buildChatPageTaskSnapshotDocument(args);
    if (!nextDocument) return;
    args.usage.recordIngestedDocument(nextDocument);
  };

  const kinPanelProps = useChatPageKinPanelProps(
    buildChatPageWorkspaceKinPanelArgs(args, controller)
  );
  const gptPanelArgs = useChatPageGptPanelArgs(
    buildChatPageWorkspaceGptPanelArgs(args, {
      controller,
      onSaveTaskSnapshot: handleSaveTaskSnapshot,
    })
  );

  return {
    controller,
    kinPanel: <KinPanel {...kinPanelProps} />,
    gptPanel: <GptPanel {...buildGptPanelProps(gptPanelArgs)} />,
  };
}
