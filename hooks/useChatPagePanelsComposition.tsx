"use client";

import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useChatPageController } from "@/hooks/useChatPageController";
import {
  buildChatPageWorkspaceGptPanelArgs,
  buildChatPageWorkspaceKinPanelArgs,
  saveChatPageTaskSnapshot,
} from "@/hooks/chatPagePanelCompositionBuilders";
import { buildChatPageWorkspaceViewArgsWithRefs } from "@/hooks/chatPageWorkspaceCompositionBuilders";
import { useChatPageControllerArgs } from "@/hooks/useChatPageControllerArgs";
import { useChatPageGptPanelArgs } from "@/hooks/useChatPageGptPanelArgs";
import { useChatPageKinPanelProps } from "@/hooks/useChatPageKinPanelProps";
import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";
import type { ChatPageWorkspaceCompositionInput } from "@/hooks/chatPageWorkspaceCompositionTypes";
import { buildGptPanelProps } from "@/lib/app/ui-state/panelPropsBuilders";

export function useChatPagePanelsComposition(
  args: {
    input: ChatPageWorkspaceCompositionInput;
    kinBottomRef: ChatPageWorkspaceViewArgs["ui"]["kinBottomRef"];
    gptBottomRef: ChatPageWorkspaceViewArgs["ui"]["gptBottomRef"];
  }
): {
  kinPanel: React.ReactElement;
  gptPanel: React.ReactElement;
} {
  const workspaceViewArgs = buildChatPageWorkspaceViewArgsWithRefs(args);
  const controller = useChatPageController(
    useChatPageControllerArgs(workspaceViewArgs)
  );
  const handleSaveTaskSnapshot = () => void saveChatPageTaskSnapshot(workspaceViewArgs);

  const kinPanelProps = useChatPageKinPanelProps(
    buildChatPageWorkspaceKinPanelArgs(workspaceViewArgs, controller)
  );
  const gptPanelArgs = useChatPageGptPanelArgs(
    buildChatPageWorkspaceGptPanelArgs(workspaceViewArgs, {
      controller,
      onSaveTaskSnapshot: handleSaveTaskSnapshot,
    })
  );

  return {
    kinPanel: <KinPanel {...kinPanelProps} />,
    gptPanel: <GptPanel {...buildGptPanelProps(gptPanelArgs)} />,
  };
}
