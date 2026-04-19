"use client";

import React from "react";
import type {
  GptPanelProtocolProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import {
  LibrarySettingsSection,
  ProtocolSettingsSection,
  SearchSettingsSection,
} from "@/components/panels/gpt/GptSettingsSections";
import {
  GPT_SETTINGS_DRAWER_TEXT,
  GPT_SETTINGS_WORKSPACE_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import { NumberField } from "@/components/panels/gpt/GptSettingsShared";
import {
  MemoryApprovalSection,
  SysRuleApprovalSection,
} from "@/components/panels/gpt/GptSettingsApprovalSections";
import {
  GoogleDriveLibrarySection,
  IngestSettingsSection,
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
    props.setLocalSettings({
      maxFacts: String(props.settings.defaultMemorySettings.maxFacts ?? 0),
      maxPreferences: String(props.settings.defaultMemorySettings.maxPreferences ?? 0),
      chatRecentLimit: String(
        props.settings.defaultMemorySettings.chatRecentLimit ?? 0
      ),
      summarizeThreshold: String(
        props.settings.defaultMemorySettings.summarizeThreshold ?? 0
      ),
      recentKeep: String(props.settings.defaultMemorySettings.recentKeep ?? 0),
    });
  };

  const handleSaveMemorySettings = () => {
    props.settings.onSaveMemorySettings({
      maxFacts: props.toPositiveInt(
        props.localSettings.maxFacts,
        props.settings.memorySettings.maxFacts ?? 0
      ),
      maxPreferences: props.toPositiveInt(
        props.localSettings.maxPreferences,
        props.settings.memorySettings.maxPreferences ?? 0
      ),
      chatRecentLimit: props.toPositiveInt(
        props.localSettings.chatRecentLimit,
        props.settings.memorySettings.chatRecentLimit ?? 0
      ),
      summarizeThreshold: props.toPositiveInt(
        props.localSettings.summarizeThreshold,
        props.settings.memorySettings.summarizeThreshold ?? 0
      ),
      recentKeep: props.toPositiveInt(
        props.localSettings.recentKeep,
        props.settings.memorySettings.recentKeep ?? 0
      ),
    });
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

      <div
        style={{
          borderRadius: 18,
          border: "1px solid #dbe4f0",
          background: "rgba(255,255,255,0.96)",
          boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
          padding: props.isMobile ? 14 : 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: props.isMobile
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <NumberField
            label="MAX_FACTS"
            value={props.localSettings.maxFacts}
            onChange={(v) =>
              props.setLocalSettings((prev) => ({ ...prev, maxFacts: v }))
            }
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxFacts}
          />
          <NumberField
            label="MAX_PREFERENCES"
            value={props.localSettings.maxPreferences}
            onChange={(v) =>
              props.setLocalSettings((prev) => ({ ...prev, maxPreferences: v }))
            }
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxPreferences}
          />
          <NumberField
            label="CHAT_RECENT_LIMIT"
            value={props.localSettings.chatRecentLimit}
            onChange={(v) =>
              props.setLocalSettings((prev) => ({ ...prev, chatRecentLimit: v }))
            }
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.chatRecentLimit}
          />
          <NumberField
            label="SUMMARIZE_THRESHOLD"
            value={props.localSettings.summarizeThreshold}
            onChange={(v) =>
              props.setLocalSettings((prev) => ({
                ...prev,
                summarizeThreshold: v,
              }))
            }
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.summarizeThreshold}
          />
          <NumberField
            label="RECENT_KEEP"
            value={props.localSettings.recentKeep}
            onChange={(v) =>
              props.setLocalSettings((prev) => ({ ...prev, recentKeep: v }))
            }
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.recentKeep}
          />
          <div>
            <div style={labelStyle}>
              {GPT_SETTINGS_WORKSPACE_TEXT.memoryCapacityPreviewLabel}
            </div>
            <div
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                background: "#f8fafc",
                fontWeight: 800,
              }}
            >
              {GPT_SETTINGS_WORKSPACE_TEXT.memoryCapacityPreviewPrefix}
              {props.memoryCapacityPreview}
            </div>
            <div style={helpTextStyle}>
              {GPT_SETTINGS_WORKSPACE_TEXT.memoryCapacityPreviewHelp}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <button
            type="button"
            style={buttonSecondaryWide}
            onClick={handleResetMemorySettings}
          >
            {GPT_SETTINGS_WORKSPACE_TEXT.reset}
          </button>
          <button
            type="button"
            style={buttonPrimary}
            onClick={handleSaveMemorySettings}
          >
            {GPT_SETTINGS_WORKSPACE_TEXT.save}
          </button>
        </div>
      </div>

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

