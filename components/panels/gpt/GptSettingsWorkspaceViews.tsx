"use client";

import React from "react";
import type {
  GptPanelProtocolProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  LibrarySettingsSection,
  ProtocolSettingsSection,
  SearchSettingsSection,
} from "@/components/panels/gpt/GptSettingsSections";
import { GPT_SETTINGS_WORKSPACE_TEXT } from "@/components/panels/gpt/gptSettingsText";
import {
  MemoryApprovalSection,
  SysRuleApprovalSection,
} from "@/components/panels/gpt/GptSettingsApprovalSections";
import { MemorySettingsSection } from "@/components/panels/gpt/GptSettingsDrawerSections";
import {
  buildLocalSettingsResetInput,
  buildMemorySettingsSaveInput,
} from "@/components/panels/gpt/GptDrawerRouterHelpers";
import {
  GoogleDriveLibrarySection,
  IngestSettingsSection,
  LibraryCardSummarySettingsSection,
} from "@/components/panels/gpt/GptSettingsLibrarySections";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";
import type { SearchEngine } from "@/types/task";
import type { PrimarySearchMode } from "@/lib/search-domain/presets";

type SearchWorkspaceControls = {
  activeSearchMode: PrimarySearchMode | undefined;
  sourceDisplayCountInput: string;
  onSetSearchPreset: (mode: PrimarySearchMode) => void;
  onToggleSearchEngine: (engine: SearchEngine) => void;
  onChangeSourceDisplayCountInput: (value: string) => void;
  onCommitSourceDisplayCount: () => void;
};

export function ChatSettingsWorkspaceView(props: {
  isMobile: boolean;
  settings: GptPanelSettingsProps;
  localSettings: LocalMemorySettingsInput;
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalMemorySettingsInput>>;
  memoryCapacityPreview: number;
  toPositiveInt: (value: string, fallback: number) => number;
}) {
  const [showApprovedMemoryRules, setShowApprovedMemoryRules] =
    React.useState<boolean>(() => {
      if (typeof window === "undefined") return false;
      return window.sessionStorage.getItem("gpt-settings-show-approved-memory") === "1";
    });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      "gpt-settings-show-approved-memory",
      showApprovedMemoryRules ? "1" : "0"
    );
  }, [showApprovedMemoryRules]);

  const handleResetMemorySettings = () => {
    props.settings.onResetMemorySettings();
    props.setLocalSettings(
      buildLocalSettingsResetInput(props.settings.defaultMemorySettings)
    );
  };

  const handleSaveMemorySettings = () => {
    props.settings.onSaveMemorySettings(
      buildMemorySettingsSaveInput({
        localSettings: props.localSettings,
        memorySettings: props.settings.memorySettings,
        toPositiveInt: props.toPositiveInt,
      })
    );
  };

  return (
    <>
      <MemoryApprovalSection
        currentTopic={props.settings.currentTopic}
        pendingCount={props.settings.pendingMemoryRuleCandidates.length}
        approvedCount={props.settings.approvedMemoryRules.length}
        isMobile={props.isMobile}
        showApproved={showApprovedMemoryRules}
        onToggleApproved={() => setShowApprovedMemoryRules((prev) => !prev)}
        approvedRules={props.settings.approvedMemoryRules}
        pendingCandidates={props.settings.pendingMemoryRuleCandidates}
        onUpdate={props.settings.onUpdateMemoryRuleCandidate}
        onApprove={props.settings.onApproveMemoryRuleCandidate}
        onReject={props.settings.onRejectMemoryRuleCandidate}
        onDelete={props.settings.onDeleteApprovedMemoryRule}
      />

      <MemorySettingsSection
        isMobile={props.isMobile}
        localSettings={props.localSettings}
        memoryCapacityPreview={props.memoryCapacityPreview}
        onFieldChange={(key, value) =>
          props.setLocalSettings((prev) => ({ ...prev, [key]: value }))
        }
        onReset={handleResetMemorySettings}
        onSave={handleSaveMemorySettings}
        text={GPT_SETTINGS_WORKSPACE_TEXT}
        cardStyle={{
          borderRadius: 18,
          border: "1px solid #dbe4f0",
          background: "rgba(255,255,255,0.96)",
          boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
          padding: props.isMobile ? 14 : 16,
        }}
        actionTopMargin={12}
      />

    </>
  );
}

export function TaskSettingsWorkspaceView(props: {
  protocol: GptPanelProtocolProps;
  settings: GptPanelSettingsProps;
}) {
  const [showApprovedIntentRules, setShowApprovedIntentRules] = React.useState(false);

  return (
    <>
      <SysRuleApprovalSection
        pendingCount={props.protocol.pendingIntentCandidates.length}
        approvedCount={props.protocol.approvedIntentPhrases.length}
        showApproved={showApprovedIntentRules}
        onToggleApproved={() => setShowApprovedIntentRules((prev) => !prev)}
        approvedPhrases={props.protocol.approvedIntentPhrases}
        pendingCandidates={props.protocol.pendingIntentCandidates}
        onUpdate={props.protocol.onUpdateIntentCandidate}
        onUpdateApproved={props.protocol.onUpdateApprovedIntentPhrase}
        onApprove={props.protocol.onApproveIntentCandidate}
        onReject={props.protocol.onRejectIntentCandidate}
        onDelete={props.protocol.onDeleteApprovedIntentPhrase}
      />

      <ProtocolSettingsSection
        autoSendKinSysInput={props.settings.autoSendKinSysInput}
        autoCopyKinSysResponseToGpt={props.settings.autoCopyKinSysResponseToGpt}
        autoSendGptSysInput={props.settings.autoSendGptSysInput}
        autoCopyGptSysResponseToKin={props.settings.autoCopyGptSysResponseToKin}
        autoCopyFileIngestSysInfoToKin={
          props.settings.autoCopyFileIngestSysInfoToKin
        }
        protocolPrompt={props.protocol.protocolPrompt}
        protocolRulebook={props.protocol.protocolRulebook}
        onChangeAutoSendKinSysInput={props.settings.onChangeAutoSendKinSysInput}
        onChangeAutoCopyKinSysResponseToGpt={
          props.settings.onChangeAutoCopyKinSysResponseToGpt
        }
        onChangeAutoSendGptSysInput={props.settings.onChangeAutoSendGptSysInput}
        onChangeAutoCopyGptSysResponseToKin={
          props.settings.onChangeAutoCopyGptSysResponseToKin
        }
        onChangeAutoCopyFileIngestSysInfoToKin={
          props.settings.onChangeAutoCopyFileIngestSysInfoToKin
        }
        onChangeProtocolPrompt={props.protocol.onChangeProtocolPrompt}
        onChangeProtocolRulebook={props.protocol.onChangeProtocolRulebook}
        onResetProtocolDefaults={props.protocol.onResetProtocolDefaults}
        onSaveProtocolDefaults={props.protocol.onSaveProtocolDefaults}
        onSetProtocolRulebookToKinDraft={
          props.protocol.onSetProtocolRulebookToKinDraft
        }
        onSendProtocolRulebookToKin={props.protocol.onSendProtocolRulebookToKin}
      />
    </>
  );
}

export function LibrarySettingsWorkspaceView(props: {
  isMobile: boolean;
  settings: GptPanelSettingsProps;
  controls: SearchWorkspaceControls;
}) {
  return (
    <>
      <LibrarySettingsSection
        isMobile={props.isMobile}
        autoLibraryReferenceEnabled={props.settings.autoLibraryReferenceEnabled}
        libraryReferenceMode={props.settings.libraryReferenceMode}
        libraryIndexResponseCount={props.settings.libraryIndexResponseCount}
        libraryReferenceCount={props.settings.libraryReferenceCount}
        libraryStorageMB={props.settings.libraryStorageMB}
        libraryReferenceEstimatedTokens={
          props.settings.libraryReferenceEstimatedTokens
        }
        onChangeAutoLibraryReferenceEnabled={
          props.settings.onChangeAutoLibraryReferenceEnabled
        }
        onChangeLibraryReferenceMode={props.settings.onChangeLibraryReferenceMode}
        onChangeLibraryIndexResponseCount={
          props.settings.onChangeLibraryIndexResponseCount
        }
        onChangeLibraryReferenceCount={props.settings.onChangeLibraryReferenceCount}
      />

      <SearchSettingsSection
        isMobile={props.isMobile}
        activeSearchMode={props.controls.activeSearchMode}
        searchLocation={props.settings.searchLocation}
        searchEngines={props.settings.searchEngines}
        sourceDisplayCountInput={props.controls.sourceDisplayCountInput}
        onSetSearchPreset={props.controls.onSetSearchPreset}
        onToggleSearchEngine={props.controls.onToggleSearchEngine}
        onChangeSearchLocation={props.settings.onChangeSearchLocation}
        onChangeSourceDisplayCountInput={
          props.controls.onChangeSourceDisplayCountInput
        }
        onCommitSourceDisplayCount={props.controls.onCommitSourceDisplayCount}
      />

      <IngestSettingsSection
        isMobile={props.isMobile}
        uploadKind={props.settings.uploadKind}
        onChangeUploadKind={props.settings.onChangeUploadKind}
        ingestMode={props.settings.ingestMode}
        onChangeIngestMode={props.settings.onChangeIngestMode}
        imageDetail={props.settings.imageDetail}
        onChangeImageDetail={props.settings.onChangeImageDetail}
        compactCharLimit={props.settings.compactCharLimit}
        simpleImageCharLimit={props.settings.simpleImageCharLimit}
        onChangeCompactCharLimit={props.settings.onChangeCompactCharLimit}
        onChangeSimpleImageCharLimit={props.settings.onChangeSimpleImageCharLimit}
        fileReadPolicy={props.settings.fileReadPolicy}
        onChangeFileReadPolicy={props.settings.onChangeFileReadPolicy}
      />

      <LibraryCardSummarySettingsSection
        driveImportAutoSummary={props.settings.driveImportAutoSummary}
        onChangeDriveImportAutoSummary={
          props.settings.onChangeDriveImportAutoSummary
        }
      />

      <GoogleDriveLibrarySection
        folderLink={props.settings.googleDriveFolderLink}
        folderId={props.settings.googleDriveFolderId}
        integrationMode={props.settings.googleDriveIntegrationMode}
        onChangeFolderLink={props.settings.onChangeGoogleDriveFolderLink}
      />
    </>
  );
}

