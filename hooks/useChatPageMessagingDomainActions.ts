"use client";

import type {
  ChatPageActionArgGroups,
  ChatPageActionGroups,
} from "@/hooks/chatPageActionTypes";
import {
  buildGptMessageActionArgs,
  buildKinTransferActionArgs,
} from "@/hooks/chatPageControllerArgBuilders";
import { useGptMessageActions } from "@/hooks/useGptMessageActions";
import { useKinTransferActions } from "@/hooks/useKinTransferActions";

export function useChatPageMessagingDomainActions(
  actions: ChatPageActionArgGroups
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
  } = useGptMessageActions(buildGptMessageActionArgs(actions));

  const {
    clearPendingKinInjection,
    registerTaskDraftFromInput,
    runStartKinTaskFromInput,
    startRegisteredTask,
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
      registerTaskDraftFromInput,
      runStartKinTaskFromInput,
      startRegisteredTask,
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
    },
  };
}
