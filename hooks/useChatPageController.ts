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

function buildChatPageControllerGroups(args: {
  kinActions: ReturnType<typeof useChatPageMessagingDomainActions>["kin"];
  gptActions: ReturnType<typeof useChatPageMessagingDomainActions>["gpt"];
  taskActions: ReturnType<typeof useChatPageTaskDomainActions>["task"];
  protocolActions: ReturnType<typeof useChatPageTaskDomainActions>["protocol"];
  injectFileToKinDraft: ReturnType<
    typeof useChatPageTaskDomainActions
  >["injectFileToKinDraft"];
  memoryActions: ReturnType<typeof useChatPageMemoryActions>;
  panelActions: ReturnType<typeof useChatPagePanelDomainActions>;
}): ChatPageControllerGroups {
  return {
    kin: args.kinActions,
    gpt: {
      ...args.gptActions,
      injectFileToKinDraft: args.injectFileToKinDraft,
    },
    task: args.taskActions,
    protocol: args.protocolActions,
    memory: args.memoryActions,
    panel: args.panelActions,
  };
}

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

  return buildChatPageControllerGroups({
    kinActions,
    gptActions,
    taskActions,
    protocolActions,
    injectFileToKinDraft,
    memoryActions,
    panelActions,
  });
}
