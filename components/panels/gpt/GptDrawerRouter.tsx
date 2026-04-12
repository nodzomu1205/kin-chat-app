"use client";

import React from "react";
import type { DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import GptMetaDrawer from "@/components/panels/gpt/GptMetaDrawer";
import GptSettingsDrawer from "@/components/panels/gpt/GptSettingsDrawer";
import GptTaskStatusDrawer from "@/components/panels/gpt/GptTaskStatusDrawer";
import ReceivedDocsDrawer from "@/components/panels/gpt/ReceivedDocsDrawer";
import TaskProgressPanel from "@/components/panels/gpt/TaskProgressPanel";
import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";

type Props = {
  activeDrawer: DrawerMode;
  props: GptPanelProps;
  localSettings: LocalMemorySettingsInput;
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalMemorySettingsInput>>;
  memoryUsed: number;
  memoryCapacity: number;
  recentCount: number;
  factCount: number;
  preferenceCount: number;
  listCount: number;
  memoryCapacityPreview: number;
  rolling5Usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  showMemoryContent: boolean;
  setShowMemoryContent: React.Dispatch<React.SetStateAction<boolean>>;
  toPositiveInt: (value: string, fallback: number) => number;
};

export default function GptDrawerRouter({
  activeDrawer,
  props,
  localSettings,
  setLocalSettings,
  memoryUsed,
  memoryCapacity,
  recentCount,
  factCount,
  preferenceCount,
  listCount,
  memoryCapacityPreview,
  rolling5Usage,
  totalUsage,
  showMemoryContent,
  setShowMemoryContent,
  toPositiveInt,
}: Props) {
  const task = props.task ?? {
    currentTaskDraft: props.currentTaskDraft,
    taskProgressView: props.taskProgressView,
    pendingInjectionCurrentPart: props.pendingInjectionCurrentPart,
    pendingInjectionTotalParts: props.pendingInjectionTotalParts,
    runPrepTaskFromInput: props.runPrepTaskFromInput,
    runDeepenTaskFromLast: props.runDeepenTaskFromLast,
    runUpdateTaskFromInput: props.runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage: props.runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask: props.runAttachSearchResultToTask,
    sendLatestGptContentToKin: props.sendLatestGptContentToKin,
    sendCurrentTaskContentToKin: props.sendCurrentTaskContentToKin,
    receiveLastKinResponseToGptInput: props.receiveLastKinResponseToGptInput,
    sendLastGptToKinDraft: props.sendLastGptToKinDraft,
    onChangeTaskTitle: props.onChangeTaskTitle,
    onChangeTaskUserInstruction: props.onChangeTaskUserInstruction,
    onChangeTaskBody: props.onChangeTaskBody,
    onAnswerTaskRequest: props.onAnswerTaskRequest,
    onPrepareTaskRequestAck: props.onPrepareTaskRequestAck,
    onPrepareTaskSync: props.onPrepareTaskSync,
    onStartKinTask: props.onStartKinTask,
    onResetTaskContext: props.onResetTaskContext,
  };
  const protocol = props.protocol ?? {
    protocolPrompt: props.protocolPrompt,
    protocolRulebook: props.protocolRulebook,
    pendingIntentCandidates: props.pendingIntentCandidates,
    approvedIntentPhrases: props.approvedIntentPhrases,
    onChangeProtocolPrompt: props.onChangeProtocolPrompt,
    onChangeProtocolRulebook: props.onChangeProtocolRulebook,
    onResetProtocolDefaults: props.onResetProtocolDefaults,
    onSaveProtocolDefaults: props.onSaveProtocolDefaults,
    onSetProtocolRulebookToKinDraft: props.onSetProtocolRulebookToKinDraft,
    onSendProtocolRulebookToKin: props.onSendProtocolRulebookToKin,
    onUpdateIntentCandidate: props.onUpdateIntentCandidate,
    onApproveIntentCandidate: props.onApproveIntentCandidate,
    onRejectIntentCandidate: props.onRejectIntentCandidate,
    onUpdateApprovedIntentPhrase: props.onUpdateApprovedIntentPhrase,
    onDeleteApprovedIntentPhrase: props.onDeleteApprovedIntentPhrase,
  };
  const references = props.references ?? {
    lastSearchContext: props.lastSearchContext,
    searchHistory: props.searchHistory,
    selectedTaskSearchResultId: props.selectedTaskSearchResultId,
    multipartAssemblies: props.multipartAssemblies,
    storedDocuments: props.storedDocuments,
    referenceLibraryItems: props.referenceLibraryItems,
    selectedTaskLibraryItemId: props.selectedTaskLibraryItemId,
    onSelectTaskSearchResult: props.onSelectTaskSearchResult,
    onMoveSearchHistoryItem: props.onMoveSearchHistoryItem,
    onDeleteSearchHistoryItem: props.onDeleteSearchHistoryItem,
    onLoadMultipartAssemblyToGptInput: props.onLoadMultipartAssemblyToGptInput,
    onDownloadMultipartAssembly: props.onDownloadMultipartAssembly,
    onDeleteMultipartAssembly: props.onDeleteMultipartAssembly,
    onLoadStoredDocumentToGptInput: props.onLoadStoredDocumentToGptInput,
    onDownloadStoredDocument: props.onDownloadStoredDocument,
    onDeleteStoredDocument: props.onDeleteStoredDocument,
    onMoveStoredDocument: props.onMoveStoredDocument,
    onMoveLibraryItem: props.onMoveLibraryItem,
    onSelectTaskLibraryItem: props.onSelectTaskLibraryItem,
      onChangeLibraryItemMode: props.onChangeLibraryItemMode,
      onStartAskAiModeSearch: props.onStartAskAiModeSearch,
      onImportYouTubeTranscript: props.onImportYouTubeTranscript,
      onSendYouTubeTranscriptToKin: props.onSendYouTubeTranscriptToKin,
      onSaveStoredDocument: props.onSaveStoredDocument,
  };
  const settings = props.settings ?? {
    memorySettings: props.memorySettings,
    defaultMemorySettings: props.defaultMemorySettings,
    tokenStats: props.tokenStats,
    responseMode: props.responseMode,
    uploadKind: props.uploadKind,
    ingestMode: props.ingestMode,
    imageDetail: props.imageDetail,
    postIngestAction: props.postIngestAction,
    fileReadPolicy: props.fileReadPolicy,
    compactCharLimit: props.compactCharLimit,
    simpleImageCharLimit: props.simpleImageCharLimit,
    ingestLoading: props.ingestLoading,
    canInjectFile: props.canInjectFile,
    searchMode: props.searchMode,
    searchEngines: props.searchEngines,
    searchLocation: props.searchLocation,
    sourceDisplayCount: props.sourceDisplayCount,
    autoLibraryReferenceEnabled: props.autoLibraryReferenceEnabled,
    libraryReferenceMode: props.libraryReferenceMode,
    libraryIndexResponseCount: props.libraryIndexResponseCount,
    libraryReferenceCount: props.libraryReferenceCount,
    libraryStorageMB: props.libraryStorageMB,
    libraryReferenceEstimatedTokens: props.libraryReferenceEstimatedTokens,
    autoSendKinSysInput: props.autoSendKinSysInput,
    autoCopyKinSysResponseToGpt: props.autoCopyKinSysResponseToGpt,
    autoSendGptSysInput: props.autoSendGptSysInput,
    autoCopyGptSysResponseToKin: props.autoCopyGptSysResponseToKin,
    autoCopyFileIngestSysInfoToKin: props.autoCopyFileIngestSysInfoToKin,
    memoryInterpreterSettings: props.memoryInterpreterSettings,
    pendingMemoryRuleCandidates: props.pendingMemoryRuleCandidates,
    approvedMemoryRules: props.approvedMemoryRules,
    onSaveMemorySettings: props.onSaveMemorySettings,
    onResetMemorySettings: props.onResetMemorySettings,
    onChangeResponseMode: props.onChangeResponseMode,
    onChangeUploadKind: props.onChangeUploadKind,
    onChangeIngestMode: props.onChangeIngestMode,
    onChangeImageDetail: props.onChangeImageDetail,
    onChangeCompactCharLimit: props.onChangeCompactCharLimit,
    onChangeSimpleImageCharLimit: props.onChangeSimpleImageCharLimit,
    onChangePostIngestAction: props.onChangePostIngestAction,
    onChangeFileReadPolicy: props.onChangeFileReadPolicy,
    onChangeSearchMode: props.onChangeSearchMode,
    onChangeSearchEngines: props.onChangeSearchEngines,
    onChangeSearchLocation: props.onChangeSearchLocation,
    onChangeSourceDisplayCount: props.onChangeSourceDisplayCount,
    onChangeAutoLibraryReferenceEnabled: props.onChangeAutoLibraryReferenceEnabled,
    onChangeLibraryReferenceMode: props.onChangeLibraryReferenceMode,
    onChangeLibraryIndexResponseCount: props.onChangeLibraryIndexResponseCount,
    onChangeLibraryReferenceCount: props.onChangeLibraryReferenceCount,
    onChangeAutoSendKinSysInput: props.onChangeAutoSendKinSysInput,
    onChangeAutoCopyKinSysResponseToGpt: props.onChangeAutoCopyKinSysResponseToGpt,
    onChangeAutoSendGptSysInput: props.onChangeAutoSendGptSysInput,
    onChangeAutoCopyGptSysResponseToKin: props.onChangeAutoCopyGptSysResponseToKin,
    onChangeAutoCopyFileIngestSysInfoToKin:
      props.onChangeAutoCopyFileIngestSysInfoToKin,
    onChangeMemoryInterpreterSettings: props.onChangeMemoryInterpreterSettings,
    onApproveMemoryRuleCandidate: props.onApproveMemoryRuleCandidate,
    onRejectMemoryRuleCandidate: props.onRejectMemoryRuleCandidate,
    onDeleteApprovedMemoryRule: props.onDeleteApprovedMemoryRule,
  };

  if (activeDrawer === "memory") {
    return (
      <GptMetaDrawer
        mode="memory"
        gptState={props.gptState}
        tokenStats={settings.tokenStats}
        recent5Chat={rolling5Usage}
        totalUsage={totalUsage}
        memoryUsed={memoryUsed}
        memoryCapacity={memoryCapacity}
        recentCount={recentCount}
        factCount={factCount}
        preferenceCount={preferenceCount}
        listCount={listCount}
        chatRecentLimit={settings.memorySettings.chatRecentLimit}
        maxFacts={settings.memorySettings.maxFacts}
        maxPreferences={settings.memorySettings.maxPreferences}
        showMemoryContent={showMemoryContent}
        onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
        isMobile={props.isMobile}
      />
    );
  }

  if (activeDrawer === "tokens") {
    return (
      <GptMetaDrawer
        mode="tokens"
        gptState={props.gptState}
        tokenStats={settings.tokenStats}
        recent5Chat={rolling5Usage}
        totalUsage={totalUsage}
        memoryUsed={memoryUsed}
        memoryCapacity={memoryCapacity}
        recentCount={recentCount}
        factCount={factCount}
        preferenceCount={preferenceCount}
        listCount={listCount}
        chatRecentLimit={settings.memorySettings.chatRecentLimit}
        maxFacts={settings.memorySettings.maxFacts}
        maxPreferences={settings.memorySettings.maxPreferences}
        showMemoryContent={showMemoryContent}
        onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
        isMobile={props.isMobile}
      />
    );
  }

  if (activeDrawer === "task_draft") {
    return (
      <GptTaskStatusDrawer
        taskDraft={task.currentTaskDraft}
        onChangeTaskTitle={task.onChangeTaskTitle}
        onChangeTaskUserInstruction={task.onChangeTaskUserInstruction}
        onChangeTaskBody={task.onChangeTaskBody}
        onResetTaskContext={task.onResetTaskContext}
        isMobile={props.isMobile}
      />
    );
  }

  if (activeDrawer === "task_progress") {
    return (
      <TaskProgressPanel
        taskProgressView={task.taskProgressView}
        onAnswerTaskRequest={task.onAnswerTaskRequest}
        onPrepareTaskRequestAck={task.onPrepareTaskRequestAck}
        onPrepareTaskSync={task.onPrepareTaskSync}
      />
    );
  }

  if (activeDrawer === "received_docs") {
    return (
      <ReceivedDocsDrawer
        multipartAssemblies={references.multipartAssemblies}
        referenceLibraryItems={references.referenceLibraryItems}
        libraryReferenceCount={settings.libraryReferenceCount}
        sourceDisplayCount={settings.sourceDisplayCount}
        selectedTaskLibraryItemId={references.selectedTaskLibraryItemId}
        onSelectTaskLibraryItem={references.onSelectTaskLibraryItem}
        onMoveLibraryItem={references.onMoveLibraryItem}
          onChangeLibraryItemMode={references.onChangeLibraryItemMode}
          onStartAskAiModeSearch={references.onStartAskAiModeSearch}
          onImportYouTubeTranscript={references.onImportYouTubeTranscript}
          onSendYouTubeTranscriptToKin={references.onSendYouTubeTranscriptToKin}
          onDownloadMultipartAssembly={references.onDownloadMultipartAssembly}
        onDeleteMultipartAssembly={references.onDeleteMultipartAssembly}
        onDownloadStoredDocument={references.onDownloadStoredDocument}
        onDeleteStoredDocument={references.onDeleteStoredDocument}
        onDeleteSearchHistoryItem={references.onDeleteSearchHistoryItem}
        onSaveStoredDocument={references.onSaveStoredDocument}
      />
    );
  }

  if (activeDrawer === "settings") {
    return (
      <GptSettingsDrawer
        localSettings={localSettings}
        onFieldChange={(key, value) =>
          setLocalSettings((prev) => ({
            ...prev,
            [key]: value,
          }))
        }
        onReset={() => {
          settings.onResetMemorySettings();
          setLocalSettings({
            maxFacts: String(settings.defaultMemorySettings.maxFacts ?? 0),
            maxPreferences: String(settings.defaultMemorySettings.maxPreferences ?? 0),
            chatRecentLimit: String(settings.defaultMemorySettings.chatRecentLimit ?? 0),
            summarizeThreshold: String(settings.defaultMemorySettings.summarizeThreshold ?? 0),
            recentKeep: String(settings.defaultMemorySettings.recentKeep ?? 0),
          });
        }}
        onSave={() => {
          settings.onSaveMemorySettings({
            maxFacts: toPositiveInt(
              localSettings.maxFacts,
              settings.memorySettings.maxFacts ?? 0
            ),
            maxPreferences: toPositiveInt(
              localSettings.maxPreferences,
              settings.memorySettings.maxPreferences ?? 0
            ),
            chatRecentLimit: toPositiveInt(
              localSettings.chatRecentLimit,
              settings.memorySettings.chatRecentLimit ?? 0
            ),
            summarizeThreshold: toPositiveInt(
              localSettings.summarizeThreshold,
              settings.memorySettings.summarizeThreshold ?? 0
            ),
            recentKeep: toPositiveInt(
              localSettings.recentKeep,
              settings.memorySettings.recentKeep ?? 0
            ),
          });
        }}
        memoryCapacityPreview={memoryCapacityPreview}
        responseMode={settings.responseMode}
        onChangeResponseMode={settings.onChangeResponseMode}
        ingestMode={settings.ingestMode}
        onChangeIngestMode={settings.onChangeIngestMode}
        imageDetail={settings.imageDetail}
        onChangeImageDetail={settings.onChangeImageDetail}
        compactCharLimit={settings.compactCharLimit}
        simpleImageCharLimit={settings.simpleImageCharLimit}
        onChangeCompactCharLimit={settings.onChangeCompactCharLimit}
        onChangeSimpleImageCharLimit={settings.onChangeSimpleImageCharLimit}
        fileReadPolicy={settings.fileReadPolicy}
        onChangeFileReadPolicy={settings.onChangeFileReadPolicy}
        searchMode={settings.searchMode}
        searchEngines={settings.searchEngines}
        searchLocation={settings.searchLocation}
        sourceDisplayCount={settings.sourceDisplayCount}
        autoLibraryReferenceEnabled={settings.autoLibraryReferenceEnabled}
        libraryReferenceMode={settings.libraryReferenceMode}
         libraryIndexResponseCount={settings.libraryIndexResponseCount}
         libraryReferenceCount={settings.libraryReferenceCount}
         libraryStorageMB={settings.libraryStorageMB}
         libraryReferenceEstimatedTokens={settings.libraryReferenceEstimatedTokens}
         autoSendKinSysInput={settings.autoSendKinSysInput}
         autoCopyKinSysResponseToGpt={settings.autoCopyKinSysResponseToGpt}
         autoSendGptSysInput={settings.autoSendGptSysInput}
         autoCopyGptSysResponseToKin={settings.autoCopyGptSysResponseToKin}
         autoCopyFileIngestSysInfoToKin={settings.autoCopyFileIngestSysInfoToKin}
        memoryInterpreterSettings={settings.memoryInterpreterSettings}
        pendingMemoryRuleCandidates={settings.pendingMemoryRuleCandidates}
        approvedMemoryRules={settings.approvedMemoryRules}
        onChangeSearchMode={settings.onChangeSearchMode}
        onChangeSearchEngines={settings.onChangeSearchEngines}
        onChangeSearchLocation={settings.onChangeSearchLocation}
        onChangeSourceDisplayCount={settings.onChangeSourceDisplayCount}
        onChangeAutoLibraryReferenceEnabled={settings.onChangeAutoLibraryReferenceEnabled}
        onChangeLibraryReferenceMode={settings.onChangeLibraryReferenceMode}
         onChangeLibraryIndexResponseCount={settings.onChangeLibraryIndexResponseCount}
         onChangeLibraryReferenceCount={settings.onChangeLibraryReferenceCount}
         onChangeAutoSendKinSysInput={settings.onChangeAutoSendKinSysInput}
         onChangeAutoCopyKinSysResponseToGpt={settings.onChangeAutoCopyKinSysResponseToGpt}
         onChangeAutoSendGptSysInput={settings.onChangeAutoSendGptSysInput}
         onChangeAutoCopyGptSysResponseToKin={settings.onChangeAutoCopyGptSysResponseToKin}
         onChangeAutoCopyFileIngestSysInfoToKin={
           settings.onChangeAutoCopyFileIngestSysInfoToKin
         }
        onChangeMemoryInterpreterSettings={settings.onChangeMemoryInterpreterSettings}
        onApproveMemoryRuleCandidate={settings.onApproveMemoryRuleCandidate}
        onRejectMemoryRuleCandidate={settings.onRejectMemoryRuleCandidate}
        onDeleteApprovedMemoryRule={settings.onDeleteApprovedMemoryRule}
         protocolPrompt={protocol.protocolPrompt}
        protocolRulebook={protocol.protocolRulebook}
        onChangeProtocolPrompt={protocol.onChangeProtocolPrompt}
        onChangeProtocolRulebook={protocol.onChangeProtocolRulebook}
        onResetProtocolDefaults={protocol.onResetProtocolDefaults}
        onSaveProtocolDefaults={protocol.onSaveProtocolDefaults}
        onSetProtocolRulebookToKinDraft={protocol.onSetProtocolRulebookToKinDraft}
        onSendProtocolRulebookToKin={protocol.onSendProtocolRulebookToKin}
        pendingIntentCandidates={protocol.pendingIntentCandidates}
        approvedIntentPhrases={protocol.approvedIntentPhrases}
        onUpdateIntentCandidate={protocol.onUpdateIntentCandidate}
        onApproveIntentCandidate={protocol.onApproveIntentCandidate}
        onRejectIntentCandidate={protocol.onRejectIntentCandidate}
        onUpdateApprovedIntentPhrase={protocol.onUpdateApprovedIntentPhrase}
        onDeleteApprovedIntentPhrase={protocol.onDeleteApprovedIntentPhrase}
        isMobile={props.isMobile}
      />
    );
  }

  return null;
}
