"use client";

import React from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/task/taskIntent";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";
import type { SearchEngine, SearchMode } from "@/types/task";
import {
  buildSearchPresetSelection,
  buildToggledSearchEngineSelection,
  normalizeSourceDisplayCountInput,
  resolveActiveSearchMode,
  type PrimarySearchMode,
} from "@/components/panels/gpt/GptSettingsSearchState";
import type { FileReadPolicy, ImageDetail, ImageLibraryImportMode, IngestMode, LibraryReferenceMode } from "./gptPanelTypes";
import {
  IngestSettingsSection,
  MemorySettingsSection,
} from "./GptSettingsDrawerSections";
import {
  LibrarySettingsSection,
  ImageLibraryReferenceSettingsSection,
  ProtocolSettingsSection,
  RulesSettingsSection,
  SearchSettingsSection,
  tabButton,
} from "./GptSettingsSections";
import { GPT_SETTINGS_DRAWER_TEXT } from "./gptSettingsText";

export type LocalMemorySettingsInput = {
  maxFacts: string;
  maxPreferences: string;
  chatRecentLimit: string;
  summarizeThreshold: string;
  recentKeep: string;
};

type Tab =
  | "memory"
  | "ingest"
  | "search"
  | "library"
  | "rules"
  | "protocol";

type Props = {
  localSettings: LocalMemorySettingsInput;
  onFieldChange: (k: keyof LocalMemorySettingsInput, v: string) => void;
  onReset: () => void;
  onSave: () => void;
  memoryCapacityPreview: number;
  ingestMode: IngestMode;
  onChangeIngestMode: (v: IngestMode) => void;
  imageDetail: ImageDetail;
  onChangeImageDetail: (v: ImageDetail) => void;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeCompactCharLimit: (v: number) => void;
  onChangeSimpleImageCharLimit: (v: number) => void;
  fileReadPolicy: FileReadPolicy;
  onChangeFileReadPolicy: (v: FileReadPolicy) => void;
  imageLibraryImportEnabled: boolean;
  onChangeImageLibraryImportEnabled: (v: boolean) => void;
  imageLibraryImportMode: ImageLibraryImportMode;
  onChangeImageLibraryImportMode: (v: ImageLibraryImportMode) => void;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  sourceDisplayCount: number;
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceMode: LibraryReferenceMode;
  libraryIndexResponseCount: number;
  libraryReferenceCount: number;
  imageLibraryReferenceEnabled: boolean;
  imageLibraryReferenceCount: number;
  imageLibraryCardLimit: number;
  libraryStorageMB: number;
  libraryReferenceEstimatedTokens: number;
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
  autoCopyFileIngestSysInfoToKin: boolean;
  memoryInterpreterSettings: MemoryInterpreterSettings;
  pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
  approvedMemoryRules: ApprovedMemoryRule[];
  onChangeSearchMode: (v: SearchMode) => void;
  onChangeSearchEngines: (v: SearchEngine[]) => void;
  onChangeSearchLocation: (v: string) => void;
  onChangeSourceDisplayCount: (v: number) => void;
  onChangeAutoLibraryReferenceEnabled: (v: boolean) => void;
  onChangeLibraryReferenceMode: (v: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (v: number) => void;
  onChangeLibraryReferenceCount: (v: number) => void;
  onChangeImageLibraryReferenceEnabled: (v: boolean) => void;
  onChangeImageLibraryReferenceCount: (v: number) => void;
  onChangeImageLibraryCardLimit: (v: number) => void;
  onChangeAutoSendKinSysInput: (v: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (v: boolean) => void;
  onChangeAutoSendGptSysInput: (v: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (v: boolean) => void;
  onChangeAutoCopyFileIngestSysInfoToKin: (v: boolean) => void;
  onChangeMemoryInterpreterSettings: (
    patch: Partial<MemoryInterpreterSettings>
  ) => void;
  onApproveMemoryRuleCandidate: (id: string) => void;
  onRejectMemoryRuleCandidate: (id: string) => void;
  onUpdateMemoryRuleCandidate: (
    id: string,
    patch: Partial<PendingMemoryRuleCandidate>
  ) => void;
  onDeleteApprovedMemoryRule: (id: string) => void;
  protocolPrompt: string;
  protocolRulebook: string;
  onChangeProtocolPrompt: (v: string) => void;
  onChangeProtocolRulebook: (v: string) => void;
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  onUpdateIntentCandidate: (
    id: string,
    patch: Partial<PendingIntentCandidate>
  ) => void;
  onApproveIntentCandidate: (id: string) => void;
  onRejectIntentCandidate: (id: string) => void;
  onUpdateApprovedIntentPhrase: (
    id: string,
    patch: Partial<ApprovedIntentPhrase>
  ) => void;
  onDeleteApprovedIntentPhrase: (id: string) => void;
  isMobile?: boolean;
};

export default function GptSettingsDrawer(props: Props) {
  const [activeTab, setActiveTab] = React.useState<Tab>("memory");
  const [showApprovedIntentRules, setShowApprovedIntentRules] = React.useState(false);
  const [showApprovedMemoryRules, setShowApprovedMemoryRules] = React.useState(false);
  const [sourceDisplayCountInput, setSourceDisplayCountInput] = React.useState(
    String(props.sourceDisplayCount)
  );

  const activeSearchMode: PrimarySearchMode | undefined =
    resolveActiveSearchMode({
      searchMode: props.searchMode,
      searchEngines: props.searchEngines,
    });

  const tabs: [Tab, string][] = [
    ["memory", GPT_SETTINGS_DRAWER_TEXT.tabs.memory],
    ["ingest", GPT_SETTINGS_DRAWER_TEXT.tabs.ingest],
    ["search", GPT_SETTINGS_DRAWER_TEXT.tabs.search],
    ["library", GPT_SETTINGS_DRAWER_TEXT.tabs.library],
    ["rules", GPT_SETTINGS_DRAWER_TEXT.tabs.rules],
    ["protocol", GPT_SETTINGS_DRAWER_TEXT.tabs.protocol],
  ];

  const setSearchPreset = (mode: PrimarySearchMode) => {
    const next = buildSearchPresetSelection(mode);
    props.onChangeSearchMode(next.searchMode);
    props.onChangeSearchEngines(next.searchEngines);
  };

  React.useEffect(() => {
    setSourceDisplayCountInput(String(props.sourceDisplayCount));
  }, [props.sourceDisplayCount]);

  const toggleSearchEngine = (engine: SearchEngine) => {
    const next = buildToggledSearchEngineSelection({
      searchEngines: props.searchEngines,
      engine,
    });
    props.onChangeSearchEngines(next.searchEngines);
    if (next.inferredSearchMode) {
      props.onChangeSearchMode(next.inferredSearchMode);
    }
  };

  const commitSourceDisplayCount = () => {
    const nextValue = normalizeSourceDisplayCountInput({
      input: sourceDisplayCountInput,
      currentValue: props.sourceDisplayCount,
    });
    setSourceDisplayCountInput(String(nextValue));
    if (nextValue !== props.sourceDisplayCount) {
      props.onChangeSourceDisplayCount(nextValue);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            style={tabButton(activeTab === key)}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "memory" ? (
        <MemorySettingsSection
          isMobile={props.isMobile}
          localSettings={props.localSettings}
          memoryCapacityPreview={props.memoryCapacityPreview}
          onFieldChange={props.onFieldChange}
          onReset={props.onReset}
          onSave={props.onSave}
        />
      ) : null}

      {activeTab === "ingest" ? (
        <IngestSettingsSection
          isMobile={props.isMobile}
          fileReadPolicy={props.fileReadPolicy}
          imageLibraryImportEnabled={props.imageLibraryImportEnabled}
          imageLibraryImportMode={props.imageLibraryImportMode}
          ingestMode={props.ingestMode}
          imageDetail={props.imageDetail}
          compactCharLimit={props.compactCharLimit}
          simpleImageCharLimit={props.simpleImageCharLimit}
          onChangeFileReadPolicy={props.onChangeFileReadPolicy}
          onChangeImageLibraryImportEnabled={
            props.onChangeImageLibraryImportEnabled
          }
          onChangeImageLibraryImportMode={props.onChangeImageLibraryImportMode}
          onChangeIngestMode={props.onChangeIngestMode}
          onChangeImageDetail={props.onChangeImageDetail}
          onChangeCompactCharLimit={props.onChangeCompactCharLimit}
          onChangeSimpleImageCharLimit={props.onChangeSimpleImageCharLimit}
        />
      ) : null}

      {activeTab === "search" ? (
        <SearchSettingsSection
          isMobile={props.isMobile}
          activeSearchMode={activeSearchMode}
          searchLocation={props.searchLocation}
          searchEngines={props.searchEngines}
          sourceDisplayCountInput={sourceDisplayCountInput}
          onSetSearchPreset={setSearchPreset}
          onToggleSearchEngine={toggleSearchEngine}
          onChangeSearchLocation={props.onChangeSearchLocation}
          onChangeSourceDisplayCountInput={setSourceDisplayCountInput}
          onCommitSourceDisplayCount={commitSourceDisplayCount}
        />
      ) : null}

      {activeTab === "library" ? (
        <>
          <LibrarySettingsSection
            isMobile={props.isMobile}
            autoLibraryReferenceEnabled={props.autoLibraryReferenceEnabled}
            libraryReferenceMode={props.libraryReferenceMode}
            libraryIndexResponseCount={props.libraryIndexResponseCount}
            libraryReferenceCount={props.libraryReferenceCount}
            libraryStorageMB={props.libraryStorageMB}
            libraryReferenceEstimatedTokens={props.libraryReferenceEstimatedTokens}
            onChangeAutoLibraryReferenceEnabled={props.onChangeAutoLibraryReferenceEnabled}
            onChangeLibraryReferenceMode={props.onChangeLibraryReferenceMode}
            onChangeLibraryIndexResponseCount={props.onChangeLibraryIndexResponseCount}
            onChangeLibraryReferenceCount={props.onChangeLibraryReferenceCount}
          />
          <ImageLibraryReferenceSettingsSection
            isMobile={props.isMobile}
            imageLibraryReferenceEnabled={props.imageLibraryReferenceEnabled}
            imageLibraryReferenceCount={props.imageLibraryReferenceCount}
            imageLibraryCardLimit={props.imageLibraryCardLimit}
            onChangeImageLibraryReferenceEnabled={
              props.onChangeImageLibraryReferenceEnabled
            }
            onChangeImageLibraryReferenceCount={
              props.onChangeImageLibraryReferenceCount
            }
            onChangeImageLibraryCardLimit={props.onChangeImageLibraryCardLimit}
          />
        </>
      ) : null}

      {activeTab === "rules" ? (
        <RulesSettingsSection
          memoryInterpreterSettings={props.memoryInterpreterSettings}
          pendingMemoryRuleCandidates={props.pendingMemoryRuleCandidates}
          approvedMemoryRules={props.approvedMemoryRules}
          pendingIntentCandidates={props.pendingIntentCandidates}
          approvedIntentPhrases={props.approvedIntentPhrases}
          showApprovedMemoryRules={showApprovedMemoryRules}
          showApprovedIntentRules={showApprovedIntentRules}
          onToggleApprovedMemoryRules={() => setShowApprovedMemoryRules((prev) => !prev)}
          onToggleApprovedIntentRules={() => setShowApprovedIntentRules((prev) => !prev)}
          onChangeMemoryInterpreterSettings={props.onChangeMemoryInterpreterSettings}
          onApproveMemoryRuleCandidate={props.onApproveMemoryRuleCandidate}
          onRejectMemoryRuleCandidate={props.onRejectMemoryRuleCandidate}
          onUpdateMemoryRuleCandidate={props.onUpdateMemoryRuleCandidate}
          onDeleteApprovedMemoryRule={props.onDeleteApprovedMemoryRule}
          onApproveIntentCandidate={props.onApproveIntentCandidate}
          onRejectIntentCandidate={props.onRejectIntentCandidate}
          onDeleteApprovedIntentPhrase={props.onDeleteApprovedIntentPhrase}
          isMobile={props.isMobile}
        />
      ) : null}

      {activeTab === "protocol" ? (
        <ProtocolSettingsSection
          autoSendKinSysInput={props.autoSendKinSysInput}
          autoCopyKinSysResponseToGpt={props.autoCopyKinSysResponseToGpt}
          autoSendGptSysInput={props.autoSendGptSysInput}
          autoCopyGptSysResponseToKin={props.autoCopyGptSysResponseToKin}
          autoCopyFileIngestSysInfoToKin={props.autoCopyFileIngestSysInfoToKin}
          protocolPrompt={props.protocolPrompt}
          protocolRulebook={props.protocolRulebook}
          onChangeAutoSendKinSysInput={props.onChangeAutoSendKinSysInput}
          onChangeAutoCopyKinSysResponseToGpt={props.onChangeAutoCopyKinSysResponseToGpt}
          onChangeAutoSendGptSysInput={props.onChangeAutoSendGptSysInput}
          onChangeAutoCopyGptSysResponseToKin={props.onChangeAutoCopyGptSysResponseToKin}
          onChangeAutoCopyFileIngestSysInfoToKin={props.onChangeAutoCopyFileIngestSysInfoToKin}
          onChangeProtocolPrompt={props.onChangeProtocolPrompt}
          onChangeProtocolRulebook={props.onChangeProtocolRulebook}
          onResetProtocolDefaults={props.onResetProtocolDefaults}
          onSaveProtocolDefaults={props.onSaveProtocolDefaults}
          onSetProtocolRulebookToKinDraft={props.onSetProtocolRulebookToKinDraft}
          onSendProtocolRulebookToKin={props.onSendProtocolRulebookToKin}
        />
      ) : null}
    </div>
  );
}

