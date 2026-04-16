import type {
  ChatPageActionGroups,
  UseChatPageActionsArgs,
  UseFileIngestActionsArgs,
  UseGptMessageActionsArgs,
  UseKinTransferActionsArgs,
  UseTaskDraftActionsArgs,
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";
import { useFileIngestActions } from "@/hooks/useFileIngestActions";
import { useChatPageGptActions } from "@/hooks/useChatPageGptActions";
import { useChatPageKinActions } from "@/hooks/useChatPageKinActions";
import { useChatPageTaskActions } from "@/hooks/useChatPageTaskActions";
import { useChatPageProtocolActions } from "@/hooks/useChatPageProtocolActions";
import { useChatPageMemoryActions } from "@/hooks/useChatPageMemoryActions";
import {
  usePanelResetActions,
  type PanelResetActionArgs,
} from "@/hooks/usePanelResetActions";
import {
  useProtocolAutomationEffects,
  type ProtocolAutomationEffectArgs,
} from "@/hooks/useProtocolAutomationEffects";

type ProtocolAutomationControllerArgs = Omit<
  ProtocolAutomationEffectArgs,
  "sendToKin" | "sendToGpt"
>;

type PanelResetControllerArgs = Omit<
  PanelResetActionArgs,
  "clearPendingKinInjection"
>;

export type UseChatPageControllerArgs = {
  actions: UseChatPageActionsArgs;
  protocolAutomation: ProtocolAutomationControllerArgs;
  panelReset: PanelResetControllerArgs;
};

export type ChatPageControllerGroups = ChatPageActionGroups & {
  panel: ReturnType<typeof usePanelResetActions>;
};

export function useChatPageController(args: UseChatPageControllerArgs) {
  const gptMessageActionArgs: UseGptMessageActionsArgs = {
    applyChatUsage: args.actions.applyChatUsage,
    applyPrefixedTaskFieldsFromText: args.actions.applyPrefixedTaskFieldsFromText,
    applySearchUsage: args.actions.applySearchUsage,
    applySummaryUsage: args.actions.applySummaryUsage,
    buildLibraryReferenceContext: args.actions.buildLibraryReferenceContext,
    chatBridgeSettings: args.actions.chatBridgeSettings,
    currentTaskDraft: args.actions.currentTaskDraft,
    getAskAiModeLinkForQuery: args.actions.getAskAiModeLinkForQuery,
    getContinuationTokenForSeries: args.actions.getContinuationTokenForSeries,
    gptInput: args.actions.gptInput,
    gptLoading: args.actions.gptLoading,
    gptMemoryRuntime: args.actions.gptMemoryRuntime,
    ingestProtocolMessage: args.actions.ingestProtocolMessage,
    isMobile: args.actions.isMobile,
    kinMessages: args.actions.kinMessages,
    lastSearchContext: args.actions.lastSearchContext,
    libraryIndexResponseCount: args.actions.libraryIndexResponseCount,
    processMultipartTaskDoneText: args.actions.processMultipartTaskDoneText,
    recordIngestedDocument: args.actions.recordIngestedDocument,
    recordSearchContext: args.actions.recordSearchContext,
    referenceLibraryItems: args.actions.referenceLibraryItems,
    responseMode: args.actions.responseMode,
    searchEngines: args.actions.searchEngines,
    searchLocation: args.actions.searchLocation,
    searchMode: args.actions.searchMode,
    setActiveTab: args.actions.setActiveTab,
    setGptInput: args.actions.setGptInput,
    setGptLoading: args.actions.setGptLoading,
    setGptMessages: args.actions.setGptMessages,
    setKinInput: args.actions.setKinInput,
    setPendingKinInjectionBlocks: args.actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.actions.setPendingKinInjectionIndex,
    taskProtocol: args.actions.taskProtocol,
  };
  const gptActions = useChatPageGptActions(gptMessageActionArgs);

  const kinTransferActionArgs: UseKinTransferActionsArgs = {
    applyTaskUsage: args.actions.applyTaskUsage,
    approvedIntentPhrases: args.actions.approvedIntentPhrases,
    currentKin: args.actions.currentKin,
    currentTaskDraft: args.actions.currentTaskDraft,
    getTaskBaseText: args.actions.getTaskBaseText,
    getTaskSlotLabel: args.actions.getTaskSlotLabel,
    gptInput: args.actions.gptInput,
    gptMessages: args.actions.gptMessages,
    ingestProtocolMessage: args.actions.ingestProtocolMessage,
    isMobile: args.actions.isMobile,
    kinInput: args.actions.kinInput,
    kinLoading: args.actions.kinLoading,
    pendingIntentCandidates: args.actions.pendingIntentCandidates,
    pendingKinInjectionBlocks: args.actions.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: args.actions.pendingKinInjectionIndex,
    processMultipartTaskDoneText: args.actions.processMultipartTaskDoneText,
    rejectedIntentCandidateSignatures:
      args.actions.rejectedIntentCandidateSignatures,
    responseMode: args.actions.responseMode,
    setActiveTab: args.actions.setActiveTab,
    setGptInput: args.actions.setGptInput,
    setGptLoading: args.actions.setGptLoading,
    setGptMessages: args.actions.setGptMessages,
    setKinConnectionState: args.actions.setKinConnectionState,
    setKinInput: args.actions.setKinInput,
    setKinLoading: args.actions.setKinLoading,
    setKinMessages: args.actions.setKinMessages,
    setPendingIntentCandidates: args.actions.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: args.actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.actions.setPendingKinInjectionIndex,
    syncTaskDraftFromProtocol: args.actions.syncTaskDraftFromProtocol,
    taskProtocol: args.actions.taskProtocol,
  };
  const kinActions = useChatPageKinActions(kinTransferActionArgs, {
    onPendingKinAck: gptActions.onPendingKinAck,
    sendLastKinToGptDraft: gptActions.sendLastKinToGptDraft,
  });

  const taskDraftActionArgs: UseTaskDraftActionsArgs = {
    applyPrefixedTaskFieldsFromText: args.actions.applyPrefixedTaskFieldsFromText,
    applySummaryUsage: args.actions.applySummaryUsage,
    applyTaskUsage: args.actions.applyTaskUsage,
    currentTaskDraft: args.actions.currentTaskDraft,
    getResolvedTaskTitle: args.actions.getResolvedTaskTitle,
    getTaskBaseText: args.actions.getTaskBaseText,
    getTaskLibraryItem: args.actions.getTaskLibraryItem,
    gptInput: args.actions.gptInput,
    gptLoading: args.actions.gptLoading,
    gptMemoryRuntime: args.actions.gptMemoryRuntime,
    gptMessages: args.actions.gptMessages,
    lastSearchContext: args.actions.lastSearchContext,
    setCurrentTaskDraft: args.actions.setCurrentTaskDraft,
    setGptInput: args.actions.setGptInput,
    setGptLoading: args.actions.setGptLoading,
    setGptMessages: args.actions.setGptMessages,
  };
  const taskDraftActions = useChatPageTaskActions(taskDraftActionArgs);

  const taskProtocolActionArgs: UseTaskProtocolActionsArgs = {
    applyTaskUsage: args.actions.applyTaskUsage,
    approvedIntentPhrases: args.actions.approvedIntentPhrases,
    currentTaskDraft: args.actions.currentTaskDraft,
    isMobile: args.actions.isMobile,
    pendingIntentCandidates: args.actions.pendingIntentCandidates,
    promptDefaultKey: args.actions.promptDefaultKey,
    protocolPrompt: args.actions.protocolPrompt,
    protocolRulebook: args.actions.protocolRulebook,
    responseMode: args.actions.responseMode,
    rulebookDefaultKey: args.actions.rulebookDefaultKey,
    setActiveTab: args.actions.setActiveTab,
    setApprovedIntentPhrases: args.actions.setApprovedIntentPhrases,
    setGptMessages: args.actions.setGptMessages,
    setKinInput: args.actions.setKinInput,
    setPendingIntentCandidates: args.actions.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: args.actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.actions.setPendingKinInjectionIndex,
    setProtocolPrompt: args.actions.setProtocolPrompt,
    setProtocolRulebook: args.actions.setProtocolRulebook,
    setRejectedIntentCandidateSignatures:
      args.actions.setRejectedIntentCandidateSignatures,
    syncTaskDraftFromProtocol: args.actions.syncTaskDraftFromProtocol,
    taskProtocol: args.actions.taskProtocol,
  };
  const protocolActions = useChatPageProtocolActions(taskProtocolActionArgs, {
    sendKinMessage: kinActions.sendKinMessage,
  });

  const fileIngestActionArgs: UseFileIngestActionsArgs = {
    applyIngestUsage: args.actions.applyIngestUsage,
    applyTaskUsage: args.actions.applyTaskUsage,
    autoCopyFileIngestSysInfoToKin:
      args.actions.autoCopyFileIngestSysInfoToKin,
    currentTaskDraft: args.actions.currentTaskDraft,
    getResolvedTaskTitle: args.actions.getResolvedTaskTitle,
    getTaskBaseText: args.actions.getTaskBaseText,
    gptInput: args.actions.gptInput,
    gptMemoryRuntime: args.actions.gptMemoryRuntime,
    ingestLoading: args.actions.ingestLoading,
    isMobile: args.actions.isMobile,
    recordIngestedDocument: args.actions.recordIngestedDocument,
    resolveTaskTitleFromDraft: args.actions.resolveTaskTitleFromDraft,
    responseMode: args.actions.responseMode,
    setActiveTab: args.actions.setActiveTab,
    setCurrentTaskDraft: args.actions.setCurrentTaskDraft,
    setGptInput: args.actions.setGptInput,
    setGptMessages: args.actions.setGptMessages,
    setIngestLoading: args.actions.setIngestLoading,
    setKinInput: args.actions.setKinInput,
    setPendingKinInjectionBlocks: args.actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.actions.setPendingKinInjectionIndex,
    setUploadKind: args.actions.setUploadKind,
  };
  const { injectFileToKinDraft } = useFileIngestActions(fileIngestActionArgs);

  const memoryActions = useChatPageMemoryActions({
    gptMemorySettingsControls: args.actions.gptMemorySettingsControls,
  });

  const chatPageActions = {
    kin: kinActions,
    gpt: {
      ...gptActions.actions,
      injectFileToKinDraft,
    },
    task: {
      ...taskDraftActions,
      prepareTaskRequestAck: protocolActions.prepareTaskRequestAck,
      prepareTaskSync: protocolActions.prepareTaskSync,
      prepareTaskSuspend: protocolActions.prepareTaskSuspend,
    },
    protocol: protocolActions,
    memory: memoryActions,
  } satisfies ChatPageActionGroups;
  useProtocolAutomationEffects({
    ...args.protocolAutomation,
    sendToKin: chatPageActions.kin.sendToKin,
    sendToGpt: chatPageActions.gpt.sendToGpt,
  });

  const panelResetActions = usePanelResetActions({
    ...args.panelReset,
    clearPendingKinInjection: kinActions.clearPendingKinInjection,
  });

  return {
    ...chatPageActions,
    panel: panelResetActions,
  } satisfies ChatPageControllerGroups;
}
