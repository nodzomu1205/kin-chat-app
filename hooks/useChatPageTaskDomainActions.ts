"use client";

import type {
  ChatPageActionGroups,
  UseChatPageActionsArgs,
} from "@/hooks/chatPageActionTypes";
import {
  buildFileIngestActionArgs,
  buildTaskDraftActionArgs,
  buildTaskProtocolActionArgs,
} from "@/hooks/chatPageControllerArgBuilders";
import { useFileIngestActions } from "@/hooks/useFileIngestActions";
import { useTaskDraftActions } from "@/hooks/useTaskDraftActions";
import { useTaskProtocolActions } from "@/hooks/useTaskProtocolActions";

export function useChatPageTaskDomainActions(
  actions: UseChatPageActionsArgs,
  deps: { sendKinMessage: (text: string) => Promise<void> }
): {
  task: ChatPageActionGroups["task"];
  protocol: ChatPageActionGroups["protocol"];
  injectFileToKinDraft: ChatPageActionGroups["gpt"]["injectFileToKinDraft"];
} {
  const taskDraftActions = useTaskDraftActions(
    buildTaskDraftActionArgs(actions)
  );
  const protocolActions = useTaskProtocolActions(
    buildTaskProtocolActionArgs(actions),
    deps
  );
  const { injectFileToKinDraft } = useFileIngestActions(
    buildFileIngestActionArgs(actions)
  );

  return {
    task: {
      ...taskDraftActions,
      prepareTaskRequestAck: protocolActions.prepareTaskRequestAck,
      prepareTaskSync: protocolActions.prepareTaskSync,
      prepareTaskSuspend: protocolActions.prepareTaskSuspend,
    },
    protocol: protocolActions,
    injectFileToKinDraft,
  };
}
