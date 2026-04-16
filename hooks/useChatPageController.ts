import type {
  ChatPageActionArgGroups,
  ChatPageActionGroups,
  UseChatPageActionsArgs,
} from "@/hooks/chatPageActionTypes";
import { flattenChatPageActionArgGroups } from "@/hooks/chatPageActionTypes";
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
  const actions: UseChatPageActionsArgs = flattenChatPageActionArgGroups(
    args.actions
  );
  const { kin: kinActions, gpt: gptActions } =
    useChatPageMessagingDomainActions(actions);

  const {
    task: taskActions,
    protocol: protocolActions,
    injectFileToKinDraft,
  } = useChatPageTaskDomainActions(actions, {
    sendKinMessage: kinActions.sendKinMessage,
  });

  const memoryActions = useChatPageMemoryActions({
    gptMemorySettingsControls: actions.gptMemorySettingsControls,
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
