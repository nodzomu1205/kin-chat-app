"use client";

import type { ChatPageGptPanelCompositionArgs } from "@/hooks/chatPagePanelCompositionTypes";
import type { BuildGptPanelArgs } from "@/lib/app/ui-state/panelPropsBuilders";

export function useChatPageGptPanelArgs(
  args: ChatPageGptPanelCompositionArgs
): BuildGptPanelArgs {
  return {
    header: {
      currentKin: args.app.currentKin,
      currentKinLabel: args.app.currentKinLabel,
      kinStatus: args.app.kinStatus,
      isMobile: args.app.isMobile,
      onSwitchPanel: args.onSwitchToKinPanel,
    },
    chat: {
      gptState: args.gptState.gptState,
      gptMessages: args.gptState.gptMessages,
      gptInput: args.gptState.gptInput,
      setGptInput: args.gptState.setGptInput,
      sendToGpt: args.controller.gpt.sendToGpt,
      injectFileToKinDraft: args.controller.gpt.injectFileToKinDraft,
      resetGptForCurrentKin: args.controller.panel.handleResetGpt,
      loading: args.gptState.loading,
      gptBottomRef: args.gptState.gptBottomRef,
    },
    task: {
      currentTaskDraft: args.task.currentTaskDraft,
      taskRegistrationDraft: args.task.taskRegistrationDraft,
      taskDraftCount: args.task.taskDraftCount,
      activeTaskDraftIndex: args.task.activeTaskDraftIndex,
      registeredTasks: args.task.registeredTasks,
      editingRegisteredTaskId: args.task.editingRegisteredTaskId,
      taskRegistrationLibrarySettings: args.task.taskRegistrationLibrarySettings,
      taskRegistrationRecurrence: args.task.taskRegistrationRecurrence,
      taskProgressView: args.taskProtocolView.progressView,
      taskProgressCount: args.taskProtocolView.progressViews.length,
      activeTaskProgressIndex: args.taskProtocolView.activeProgressIndex,
      runPrepTaskFromInput: args.controller.task.runPrepTaskFromInput,
      runDeepenTaskFromLast: args.controller.task.runDeepenTaskFromLast,
      runUpdateTaskFromInput: args.controller.task.runUpdateTaskFromInput,
      runUpdateTaskFromLastGptMessage:
        args.controller.task.runUpdateTaskFromLastGptMessage,
      runAttachSearchResultToTask:
        args.controller.task.runAttachSearchResultToTask,
      sendLatestGptContentToKin: args.controller.kin.sendLatestGptContentToKin,
      sendCurrentTaskContentToKin: args.controller.kin.sendCurrentTaskContentToKin,
      onRegisterTaskDraft: args.controller.kin.registerTaskDraftFromInput,
      onStartRegisteredTask: args.controller.kin.startRegisteredTask,
      onRegisterCurrentTaskDraft: args.task.registerCurrentTaskDraft,
      onSaveCurrentTaskDraftToRegisteredTask:
        args.task.saveCurrentTaskDraftToRegisteredTask,
      onEditRegisteredTask: args.task.editRegisteredTask,
      onDeleteRegisteredTask: args.task.deleteRegisteredTask,
      onCancelTaskRegistrationEdit: args.task.cancelTaskRegistrationEdit,
      onChangeTaskRegistrationLibrarySettings: (patch) =>
        args.task.setTaskRegistrationLibrarySettings((prev) => ({
          ...prev,
          ...patch,
        })),
      onChangeTaskRegistrationRecurrence: (patch) =>
        args.task.setTaskRegistrationRecurrence((prev) => ({
          ...prev,
          ...patch,
        })),
      sendLastGptToKinDraft: args.controller.kin.sendLastGptToKinDraft,
      onSaveTaskSnapshot: args.task.onSaveTaskSnapshot,
      onSelectPreviousTaskDraft: args.task.onSelectPreviousTaskDraft,
      onSelectNextTaskDraft: args.task.onSelectNextTaskDraft,
      onPrepareTaskRequestAck: args.controller.task.prepareTaskRequestAck,
      onPrepareTaskSync: args.controller.task.prepareTaskSync,
      onPrepareTaskSuspend: args.controller.task.prepareTaskSuspend,
      onUpdateTaskProgressCounts: args.taskProtocolView.onUpdateTaskProgressCounts,
      onClearTaskProgress: args.taskProtocolView.onClearTaskProgress,
      onSelectPreviousTaskProgress: args.taskProtocolView.onSelectPreviousTaskProgress,
      onSelectNextTaskProgress: args.taskProtocolView.onSelectNextTaskProgress,
      onStartKinTask: args.controller.kin.runStartKinTaskFromInput,
      onResetTaskContext: args.task.resetCurrentTaskDraft,
      pendingInjection: args.pendingInjection,
      updateTaskDraftFields: args.task.updateTaskDraftFields,
      pendingRequests: args.task.pendingRequests,
      buildTaskRequestAnswerDraft: args.task.buildTaskRequestAnswerDraft,
    },
    protocol: {
      protocolPrompt: args.protocolState.protocolPrompt,
      protocolRulebook: args.protocolState.protocolRulebook,
      pendingIntentCandidates: args.protocolState.pendingIntentCandidates,
      approvedIntentPhrases: args.protocolState.approvedIntentPhrases,
      onChangeProtocolPrompt: args.protocolState.onChangeProtocolPrompt,
      onChangeProtocolRulebook: args.protocolState.onChangeProtocolRulebook,
      onResetProtocolDefaults: args.controller.protocol.resetProtocolDefaults,
      onSaveProtocolDefaults: args.controller.protocol.saveProtocolDefaults,
      onSetProtocolRulebookToKinDraft:
        args.controller.protocol.setProtocolRulebookToKinDraft,
      onSendProtocolRulebookToKin:
        args.controller.protocol.sendProtocolRulebookToKin,
      onUpdateIntentCandidate: args.controller.protocol.updateIntentCandidate,
      onApproveIntentCandidate: args.controller.protocol.approveIntentCandidate,
      onRejectIntentCandidate: args.controller.protocol.rejectIntentCandidate,
      onUpdateApprovedIntentPhrase:
        args.controller.protocol.updateApprovedIntentPhrase,
      onDeleteApprovedIntentPhrase:
        args.controller.protocol.deleteApprovedIntentPhrase,
    },
    references: {
      lastSearchContext: args.references.lastSearchContext,
      searchHistory: args.references.searchHistory,
      selectedTaskSearchResultId: args.references.selectedTaskSearchResultId,
      multipartAssemblies: args.references.multipartAssemblies,
      storedDocuments: args.references.storedDocuments,
      referenceLibraryItems: args.references.referenceLibraryItems,
      selectedTaskLibraryItemId: args.references.selectedTaskLibraryItemId,
      onSelectTaskSearchResult: args.references.onSelectTaskSearchResult,
      onMoveSearchHistoryItem: args.references.onMoveSearchHistoryItem,
      onDeleteSearchHistoryItem: args.references.onDeleteSearchHistoryItem,
      onLoadMultipartAssemblyToGptInput:
        args.references.onLoadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: args.references.onDownloadMultipartAssembly,
      onDeleteMultipartAssembly: args.references.onDeleteMultipartAssembly,
      onLoadStoredDocumentToGptInput:
        args.references.onLoadStoredDocumentToGptInput,
      onDownloadStoredDocument: args.references.onDownloadStoredDocument,
      onDeleteStoredDocument: args.references.onDeleteStoredDocument,
      onMoveStoredDocument: args.references.onMoveStoredDocument,
      onMoveLibraryItem: args.references.onMoveLibraryItem,
      onSelectTaskLibraryItem: args.references.onSelectTaskLibraryItem,
      onChangeLibraryItemMode: args.references.onChangeLibraryItemMode,
      onStartAskAiModeSearch: args.controller.gpt.startAskAiModeSearch,
      onImportYouTubeTranscript: args.controller.gpt.importYouTubeTranscript,
      onSendYouTubeTranscriptToKin:
        args.controller.gpt.sendYouTubeTranscriptToKin,
      onSaveStoredDocument: args.references.onSaveStoredDocument,
      onShowLibraryItemInChat: args.references.onShowLibraryItemInChat,
      onSendLibraryItemToKin: args.references.onSendLibraryItemToKin,
      onShowAllLibraryItemsInChat: args.references.onShowAllLibraryItemsInChat,
      onSendAllLibraryItemsToKin: args.references.onSendAllLibraryItemsToKin,
      onUploadLibraryItemToGoogleDrive:
        args.references.onUploadLibraryItemToGoogleDrive,
      onRenderPresentationPlanToPpt:
        args.references.onRenderPresentationPlanToPpt,
      onImportDeviceImageFile: args.references.onImportDeviceImageFile,
      onImportGoogleDriveImageFile: args.references.onImportGoogleDriveImageFile,
    },
    settings: {
      ...args.settings,
      memoryInterpreterSettings: args.memoryState.memoryInterpreterSettings,
      pendingMemoryRuleCandidates: args.memoryState.pendingMemoryRuleCandidates,
      approvedMemoryRules: args.memoryState.approvedMemoryRules,
      onSaveMemorySettings: args.controller.memory.handleSaveMemorySettings,
      onResetMemorySettings: args.controller.memory.handleResetMemorySettings,
      onChangeGoogleDriveFolderLink:
        args.settings.onChangeGoogleDriveFolderLink,
      onOpenGoogleDriveFolder: args.settings.onOpenGoogleDriveFolder,
      onImportGoogleDriveFile: args.settings.onImportGoogleDriveFile,
      onIndexGoogleDriveFolder: args.settings.onIndexGoogleDriveFolder,
      onImportGoogleDriveFolder: args.settings.onImportGoogleDriveFolder,
      onApproveMemoryRuleCandidate: args.memoryState.onApproveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: args.memoryState.onRejectMemoryRuleCandidate,
      onUpdateMemoryRuleCandidate: args.memoryState.onUpdateMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: args.memoryState.onDeleteApprovedMemoryRule,
    },
  };
}
