import type {
  ChatPageIdentityArgs,
  ChatPageProtocolArgs,
  ChatPageSearchArgs,
  ChatPageServicesArgs,
  ChatPageTaskArgs,
  ChatPageUiStateArgs,
  UseChatPageActionsArgs,
} from "@/hooks/useChatPageActions";

export function buildChatPageActionArgs(params: {
  identity: ChatPageIdentityArgs;
  uiState: ChatPageUiStateArgs;
  task: ChatPageTaskArgs;
  protocol: ChatPageProtocolArgs;
  search: ChatPageSearchArgs;
  services: ChatPageServicesArgs;
}): UseChatPageActionsArgs {
  return {
    ...params.identity,
    ...params.uiState,
    ...params.task,
    ...params.protocol,
    ...params.search,
    ...params.services,
  };
}
