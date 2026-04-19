"use client";

import React from "react";
import type { DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import GptMetaDrawer from "@/components/panels/gpt/GptMetaDrawer";
import GptSettingsDrawer from "@/components/panels/gpt/GptSettingsDrawer";
import GptTaskDrawer from "@/components/panels/gpt/GptTaskDrawer";
import ReceivedDocsDrawer from "@/components/panels/gpt/ReceivedDocsDrawer";
import type {
  GptPanelChatProps,
  GptPanelHeaderProps,
  GptPanelProtocolProps,
  GptPanelReferenceProps,
  GptPanelSettingsProps,
  GptPanelTaskProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";

function getDeviceImportAccept(kind: GptPanelSettingsProps["uploadKind"]) {
  if (kind === "image" || kind === "pdf" || kind === "mixed") {
    return ".pdf,image/*";
  }
  return ".txt,.md,.json,.csv,.tsv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.c,.cpp,.cs,.rb,.php,.html,.css,.xml,.yml,.yaml,.sql";
}

type Props = {
  activeDrawer: DrawerMode;
  header: GptPanelHeaderProps;
  chat: GptPanelChatProps;
  task: GptPanelTaskProps;
  protocol: GptPanelProtocolProps;
  references: GptPanelReferenceProps;
  settings: GptPanelSettingsProps;
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
  header,
  chat,
  task,
  protocol,
  references,
  settings,
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
  const handleImportDeviceFile = async (file: File) => {
    await chat.onInjectFile(file, {
      kind: settings.uploadKind,
      mode: settings.ingestMode,
      detail: settings.imageDetail,
      readPolicy: settings.fileReadPolicy,
      compactCharLimit: settings.compactCharLimit,
      simpleImageCharLimit: settings.simpleImageCharLimit,
    });
  };

  if (activeDrawer === "memory") {
    return (
      <GptMetaDrawer
        mode="memory"
        gptState={chat.gptState}
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
        isMobile={header.isMobile}
      />
    );
  }

  if (activeDrawer === "tokens") {
    return (
      <GptMetaDrawer
        mode="tokens"
        gptState={chat.gptState}
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
        isMobile={header.isMobile}
      />
    );
  }

  if (activeDrawer === "task") {
    return (
        <GptTaskDrawer
          currentTaskDraft={task.currentTaskDraft}
          taskDraftCount={task.taskDraftCount}
          activeTaskDraftIndex={task.activeTaskDraftIndex}
          taskProgressView={task.taskProgressView}
          taskProgressCount={task.taskProgressCount}
          activeTaskProgressIndex={task.activeTaskProgressIndex}
          onChangeTaskTitle={task.onChangeTaskTitle}
        onChangeTaskUserInstruction={task.onChangeTaskUserInstruction}
        onChangeTaskBody={task.onChangeTaskBody}
          onSaveTaskSnapshot={task.onSaveTaskSnapshot}
          onSelectPreviousTaskDraft={task.onSelectPreviousTaskDraft}
          onSelectNextTaskDraft={task.onSelectNextTaskDraft}
          onResetTaskContext={task.onResetTaskContext}
        onAnswerTaskRequest={task.onAnswerTaskRequest}
          onPrepareTaskRequestAck={task.onPrepareTaskRequestAck}
          onPrepareTaskSync={task.onPrepareTaskSync}
          onPrepareTaskSuspend={task.onPrepareTaskSuspend}
          onUpdateTaskProgressCounts={task.onUpdateTaskProgressCounts}
          onClearTaskProgress={task.onClearTaskProgress}
          onSelectPreviousTaskProgress={task.onSelectPreviousTaskProgress}
          onSelectNextTaskProgress={task.onSelectNextTaskProgress}
          isMobile={header.isMobile}
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
        onShowLibraryItemInChat={references.onShowLibraryItemInChat}
        onSendLibraryItemToKin={references.onSendLibraryItemToKin}
        onUploadLibraryItemToGoogleDrive={
          references.onUploadLibraryItemToGoogleDrive
        }
        onOpenGoogleDriveFolder={settings.onOpenGoogleDriveFolder}
        onImportGoogleDriveFile={settings.onImportGoogleDriveFile}
        onIndexGoogleDriveFolder={settings.onIndexGoogleDriveFolder}
        onImportGoogleDriveFolder={settings.onImportGoogleDriveFolder}
        onImportDeviceFile={handleImportDeviceFile}
        deviceImportAccept={getDeviceImportAccept(settings.uploadKind)}
        deviceImportDisabled={settings.ingestLoading || !settings.canInjectFile}
        isMobile={header.isMobile}
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
        onUpdateMemoryRuleCandidate={settings.onUpdateMemoryRuleCandidate}
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
        isMobile={header.isMobile}
      />
    );
  }

  return null;
}

