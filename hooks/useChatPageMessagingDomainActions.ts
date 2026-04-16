"use client";

import type {
  ChatPageActionGroups,
  UseChatPageActionsArgs,
} from "@/hooks/chatPageActionTypes";
import {
  buildGptMessageActionArgs,
  buildKinTransferActionArgs,
} from "@/hooks/chatPageControllerArgBuilders";
import { useGptMessageActions } from "@/hooks/useGptMessageActions";
import { useKinTransferActions } from "@/hooks/useKinTransferActions";

export function useChatPageMessagingDomainActions(
  actions: UseChatPageActionsArgs
): {
  kin: ChatPageActionGroups["kin"];
  gpt: Omit<ChatPageActionGroups["gpt"], "injectFileToKinDraft">;
} {
  const {
    sendToGpt,
    continueQueuedYouTubeTranscriptBatch,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
  } = useGptMessageActions(buildGptMessageActionArgs(actions));

  const {
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  } = useKinTransferActions(buildKinTransferActionArgs(actions), {
    onPendingKinAck: continueQueuedYouTubeTranscriptBatch,
  });

  return {
    kin: {
      clearPendingKinInjection,
      runStartKinTaskFromInput,
      sendKinMessage,
      sendToKin,
      sendLastKinToGptDraft,
      sendLastGptToKinDraft,
      sendLatestGptContentToKin,
      sendCurrentTaskContentToKin,
    },
    gpt: {
      sendToGpt,
      startAskAiModeSearch,
      importYouTubeTranscript,
      sendYouTubeTranscriptToKin,
      receiveLastKinResponseToGptInput,
    },
  };
}
