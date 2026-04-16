"use client";

import type {
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";
import { useTaskProtocolActions } from "@/hooks/useTaskProtocolActions";

export function useChatPageProtocolActions(
  args: UseTaskProtocolActionsArgs,
  deps: { sendKinMessage: (text: string) => Promise<void> }
): ReturnType<typeof useTaskProtocolActions> {
  return useTaskProtocolActions(args, deps);
}
