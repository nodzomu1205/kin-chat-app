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
  memoryCapacityPreview,
  rolling5Usage,
  totalUsage,
  showMemoryContent,
  setShowMemoryContent,
  toPositiveInt,
}: Props) {
  if (activeDrawer === "memory") {
    return (
      <GptMetaDrawer
        mode="memory"
        gptState={props.gptState}
        tokenStats={props.tokenStats}
        recent5Chat={rolling5Usage}
        totalUsage={totalUsage}
        memoryUsed={memoryUsed}
        memoryCapacity={memoryCapacity}
        recentCount={recentCount}
        factCount={factCount}
        preferenceCount={preferenceCount}
        chatRecentLimit={props.memorySettings.chatRecentLimit}
        maxFacts={props.memorySettings.maxFacts}
        maxPreferences={props.memorySettings.maxPreferences}
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
        tokenStats={props.tokenStats}
        recent5Chat={rolling5Usage}
        totalUsage={totalUsage}
        memoryUsed={memoryUsed}
        memoryCapacity={memoryCapacity}
        recentCount={recentCount}
        factCount={factCount}
        preferenceCount={preferenceCount}
        chatRecentLimit={props.memorySettings.chatRecentLimit}
        maxFacts={props.memorySettings.maxFacts}
        maxPreferences={props.memorySettings.maxPreferences}
        showMemoryContent={showMemoryContent}
        onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
        isMobile={props.isMobile}
      />
    );
  }

  if (activeDrawer === "task_draft") {
    return (
      <GptTaskStatusDrawer
        taskDraft={props.currentTaskDraft}
        onChangeTaskTitle={props.onChangeTaskTitle}
        onChangeTaskUserInstruction={props.onChangeTaskUserInstruction}
        onChangeTaskBody={props.onChangeTaskBody}
        onResetTaskContext={props.onResetTaskContext}
        isMobile={props.isMobile}
      />
    );
  }

  if (activeDrawer === "task_progress") {
    return (
      <TaskProgressPanel
        taskProgressView={props.taskProgressView}
        onAnswerTaskRequest={props.onAnswerTaskRequest}
        onPrepareTaskRequestAck={props.onPrepareTaskRequestAck}
        onPrepareTaskSync={props.onPrepareTaskSync}
      />
    );
  }

  if (activeDrawer === "received_docs") {
    return (
      <ReceivedDocsDrawer
        multipartAssemblies={props.multipartAssemblies}
        referenceLibraryItems={props.referenceLibraryItems}
        libraryReferenceCount={props.libraryReferenceCount}
        selectedTaskLibraryItemId={props.selectedTaskLibraryItemId}
        onSelectTaskLibraryItem={props.onSelectTaskLibraryItem}
        onMoveLibraryItem={props.onMoveLibraryItem}
        onChangeLibraryItemMode={props.onChangeLibraryItemMode}
        onDownloadMultipartAssembly={props.onDownloadMultipartAssembly}
        onDeleteMultipartAssembly={props.onDeleteMultipartAssembly}
        onDownloadStoredDocument={props.onDownloadStoredDocument}
        onDeleteStoredDocument={props.onDeleteStoredDocument}
        onDeleteSearchHistoryItem={props.onDeleteSearchHistoryItem}
        onSaveStoredDocument={props.onSaveStoredDocument}
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
          props.onResetMemorySettings();
          setLocalSettings({
            maxFacts: String(props.defaultMemorySettings.maxFacts ?? 0),
            maxPreferences: String(props.defaultMemorySettings.maxPreferences ?? 0),
            chatRecentLimit: String(props.defaultMemorySettings.chatRecentLimit ?? 0),
            summarizeThreshold: String(props.defaultMemorySettings.summarizeThreshold ?? 0),
            recentKeep: String(props.defaultMemorySettings.recentKeep ?? 0),
          });
        }}
        onSave={() => {
          props.onSaveMemorySettings({
            maxFacts: toPositiveInt(
              localSettings.maxFacts,
              props.memorySettings.maxFacts ?? 0
            ),
            maxPreferences: toPositiveInt(
              localSettings.maxPreferences,
              props.memorySettings.maxPreferences ?? 0
            ),
            chatRecentLimit: toPositiveInt(
              localSettings.chatRecentLimit,
              props.memorySettings.chatRecentLimit ?? 0
            ),
            summarizeThreshold: toPositiveInt(
              localSettings.summarizeThreshold,
              props.memorySettings.summarizeThreshold ?? 0
            ),
            recentKeep: toPositiveInt(
              localSettings.recentKeep,
              props.memorySettings.recentKeep ?? 0
            ),
          });
        }}
        memoryCapacityPreview={memoryCapacityPreview}
        responseMode={props.responseMode}
        onChangeResponseMode={props.onChangeResponseMode}
        ingestMode={props.ingestMode}
        onChangeIngestMode={props.onChangeIngestMode}
        imageDetail={props.imageDetail}
        onChangeImageDetail={props.onChangeImageDetail}
        compactCharLimit={props.compactCharLimit}
        simpleImageCharLimit={props.simpleImageCharLimit}
        onChangeCompactCharLimit={props.onChangeCompactCharLimit}
        onChangeSimpleImageCharLimit={props.onChangeSimpleImageCharLimit}
        fileReadPolicy={props.fileReadPolicy}
        onChangeFileReadPolicy={props.onChangeFileReadPolicy}
        autoSearchReferenceEnabled={props.autoSearchReferenceEnabled}
        searchReferenceMode={props.searchReferenceMode}
        searchReferenceCount={props.searchReferenceCount}
        searchHistoryLimit={props.searchHistoryLimit}
        searchHistoryStorageMB={props.searchHistoryStorageMB}
        searchReferenceEstimatedTokens={props.searchReferenceEstimatedTokens}
        autoDocumentReferenceEnabled={props.autoDocumentReferenceEnabled}
        documentReferenceMode={props.documentReferenceMode}
        documentReferenceCount={props.documentReferenceCount}
        documentStorageMB={props.documentStorageMB}
        documentReferenceEstimatedTokens={props.documentReferenceEstimatedTokens}
        autoLibraryReferenceEnabled={props.autoLibraryReferenceEnabled}
        libraryReferenceMode={props.libraryReferenceMode}
        libraryIndexResponseCount={props.libraryIndexResponseCount}
        libraryReferenceCount={props.libraryReferenceCount}
        libraryStorageMB={props.libraryStorageMB}
        libraryReferenceEstimatedTokens={props.libraryReferenceEstimatedTokens}
        onChangeAutoSearchReferenceEnabled={props.onChangeAutoSearchReferenceEnabled}
        onChangeSearchReferenceMode={props.onChangeSearchReferenceMode}
        onChangeSearchReferenceCount={props.onChangeSearchReferenceCount}
        onChangeSearchHistoryLimit={props.onChangeSearchHistoryLimit}
        onClearSearchHistory={props.onClearSearchHistory}
        onChangeAutoDocumentReferenceEnabled={props.onChangeAutoDocumentReferenceEnabled}
        onChangeDocumentReferenceMode={props.onChangeDocumentReferenceMode}
        onChangeDocumentReferenceCount={props.onChangeDocumentReferenceCount}
        onChangeAutoLibraryReferenceEnabled={props.onChangeAutoLibraryReferenceEnabled}
        onChangeLibraryReferenceMode={props.onChangeLibraryReferenceMode}
        onChangeLibraryIndexResponseCount={props.onChangeLibraryIndexResponseCount}
        onChangeLibraryReferenceCount={props.onChangeLibraryReferenceCount}
        protocolPrompt={props.protocolPrompt}
        protocolRulebook={props.protocolRulebook}
        onChangeProtocolPrompt={props.onChangeProtocolPrompt}
        onChangeProtocolRulebook={props.onChangeProtocolRulebook}
        onResetProtocolDefaults={props.onResetProtocolDefaults}
        onSaveProtocolDefaults={props.onSaveProtocolDefaults}
        onSetProtocolRulebookToKinDraft={props.onSetProtocolRulebookToKinDraft}
        onSendProtocolRulebookToKin={props.onSendProtocolRulebookToKin}
        pendingIntentCandidates={props.pendingIntentCandidates}
        approvedIntentPhrases={props.approvedIntentPhrases}
        onUpdateIntentCandidate={props.onUpdateIntentCandidate}
        onApproveIntentCandidate={props.onApproveIntentCandidate}
        onRejectIntentCandidate={props.onRejectIntentCandidate}
        isMobile={props.isMobile}
      />
    );
  }

  return null;
}
