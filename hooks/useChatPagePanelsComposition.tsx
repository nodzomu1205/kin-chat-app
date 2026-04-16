"use client";

import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import {
  useChatPageController,
  type ChatPageControllerGroups,
} from "@/hooks/useChatPageController";
import { useChatPageControllerArgs } from "@/hooks/useChatPageControllerArgs";
import { useChatPageGptPanelArgs } from "@/hooks/useChatPageGptPanelArgs";
import { useChatPageKinPanelProps } from "@/hooks/useChatPageKinPanelProps";
import type { ChatPagePanelsCompositionArgs } from "@/hooks/chatPageCompositionTypes";
import { buildGptPanelProps } from "@/lib/app/panelPropsBuilders";

export function useChatPagePanelsComposition(
  args: ChatPagePanelsCompositionArgs
): {
  controller: ChatPageControllerGroups;
  kinPanel: React.ReactElement;
  gptPanel: React.ReactElement;
} {
  const controller = useChatPageController(
    useChatPageControllerArgs(args.controller)
  );

  const kinPanelProps = useChatPageKinPanelProps({
    ...args.kinPanel,
    controller,
  });
  const gptPanelArgs = useChatPageGptPanelArgs({
    ...args.gptPanel,
    controller,
  });

  return {
    controller,
    kinPanel: <KinPanel {...kinPanelProps} />,
    gptPanel: <GptPanel {...buildGptPanelProps(gptPanelArgs)} />,
  };
}
