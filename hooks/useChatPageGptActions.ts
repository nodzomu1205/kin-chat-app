"use client";

import type {
  ChatPageActionGroups,
  UseGptMessageActionsArgs,
} from "@/hooks/chatPageActionTypes";
import { useGptMessageActions } from "@/hooks/useGptMessageActions";

export function useChatPageGptActions(args: UseGptMessageActionsArgs): {
  actions: Omit<ChatPageActionGroups["gpt"], "injectFileToKinDraft">;
  sendLastKinToGptDraft: () => void | Promise<void>;
  onPendingKinAck: () => void | Promise<void>;
} {
  const {
    sendToGpt,
    continueQueuedYouTubeTranscriptBatch,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
  } = useGptMessageActions(args);

  return {
    actions: {
      sendToGpt,
      startAskAiModeSearch,
      importYouTubeTranscript,
      sendYouTubeTranscriptToKin,
      receiveLastKinResponseToGptInput,
    },
    sendLastKinToGptDraft,
    onPendingKinAck: continueQueuedYouTubeTranscriptBatch,
  };
}
