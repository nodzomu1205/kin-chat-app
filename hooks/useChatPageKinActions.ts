"use client";

import type {
  ChatPageActionGroups,
  UseKinTransferActionsArgs,
} from "@/hooks/chatPageActionTypes";
import { useKinTransferActions } from "@/hooks/useKinTransferActions";

export function useChatPageKinActions(
  args: UseKinTransferActionsArgs,
  deps: {
    onPendingKinAck?: () => void | Promise<void>;
    sendLastKinToGptDraft: () => void | Promise<void>;
  }
): ChatPageActionGroups["kin"] {
  const {
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  } = useKinTransferActions(args, {
    onPendingKinAck: deps.onPendingKinAck,
  });

  return {
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendLastKinToGptDraft: deps.sendLastKinToGptDraft,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  };
}
