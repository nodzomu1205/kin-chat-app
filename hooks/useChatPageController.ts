import type {
  ChatPageActionArgGroups,
  ChatPageActionGroups,
} from "@/hooks/chatPageActionTypes";
import { useChatPageMemoryActions } from "@/hooks/useChatPageMemoryActions";
import { useChatPageMessagingDomainActions } from "@/hooks/useChatPageMessagingDomainActions";
import { useChatPagePanelDomainActions } from "@/hooks/useChatPagePanelDomainActions";
import { useChatPageTaskDomainActions } from "@/hooks/useChatPageTaskDomainActions";
import type { UseChatPagePanelDomainActionsArgs } from "@/hooks/useChatPagePanelDomainActions";

export type UseChatPageControllerArgs = {
  actions: ChatPageActionArgGroups;
  protocolAutomation: UseChatPagePanelDomainActionsArgs["protocolAutomation"];
  panelReset: UseChatPagePanelDomainActionsArgs["panelReset"];
};

export type ChatPageControllerGroups = ChatPageActionGroups & {
  panel: ReturnType<typeof useChatPagePanelDomainActions>;
};

export function useChatPageController(args: UseChatPageControllerArgs) {
  const { kin: kinActions, gpt: gptActions } =
    useChatPageMessagingDomainActions(args.actions);

  const {
    task: taskActions,
    protocol: protocolActions,
    injectFileToKinDraft,
  } = useChatPageTaskDomainActions(args.actions, {
    sendKinMessage: kinActions.sendKinMessage,
  });

  const memoryActions = useChatPageMemoryActions({
    services: args.actions.services,
  });
  const panelActions = useChatPagePanelDomainActions({
    protocolAutomation: args.protocolAutomation,
    panelReset: args.panelReset,
    sendToKin: kinActions.sendToKin,
    sendToGpt: gptActions.sendToGpt,
    clearPendingKinInjection: kinActions.clearPendingKinInjection,
  });

  const chatPageActions = {
    kin: kinActions,
    gpt: {
      ...gptActions,
      injectFileToKinDraft,
    },
    task: taskActions,
    protocol: protocolActions,
    memory: memoryActions,
  } satisfies ChatPageActionGroups;

  return {
    ...chatPageActions,
    panel: panelActions,
  } satisfies ChatPageControllerGroups;
}
