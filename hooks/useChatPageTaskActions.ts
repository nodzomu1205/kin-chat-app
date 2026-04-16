"use client";

import type {
  ChatPageActionGroups,
  UseTaskDraftActionsArgs,
} from "@/hooks/chatPageActionTypes";
import { useTaskDraftActions } from "@/hooks/useTaskDraftActions";

export function useChatPageTaskActions(
  args: UseTaskDraftActionsArgs
): Pick<
  ChatPageActionGroups["task"],
  | "runPrepTaskFromInput"
  | "runUpdateTaskFromInput"
  | "runUpdateTaskFromLastGptMessage"
  | "runAttachSearchResultToTask"
  | "runDeepenTaskFromLast"
> {
  return useTaskDraftActions(args);
}
