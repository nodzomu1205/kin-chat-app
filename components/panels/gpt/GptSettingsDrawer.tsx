"use client";

import React from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import {
  inferPrimarySearchModeFromEngines,
  isPrimarySearchMode,
  normalizeStoredSearchMode,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  LibraryReferenceMode,
} from "./gptPanelTypes";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";
import {
  LibrarySettingsSection,
  ProtocolSettingsSection,
  RulesSettingsSection,
  SearchSettingsSection,
  SEARCH_MODE_PRESETS,
  sectionCard,
  selectStyle,
  subtleCard,
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
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  sourceDisplayCount: number;
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceMode: LibraryReferenceMode;
  libraryIndexResponseCount: number;
  libraryReferenceCount: number;
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

function NumberField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <input
        inputMode="numeric"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={inputStyle}
      />
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

export default function GptSettingsDrawer(props: Props) {
  const [activeTab, setActiveTab] = React.useState<Tab>("memory");
  const [showApprovedIntentRules, setShowApprovedIntentRules] = React.useState(false);
  const [showApprovedMemoryRules, setShowApprovedMemoryRules] = React.useState(false);
  const [sourceDisplayCountInput, setSourceDisplayCountInput] = React.useState(
    String(props.sourceDisplayCount)
  );

  const normalizedSearchMode = normalizeStoredSearchMode(props.searchMode);
  const activeSearchMode: PrimarySearchMode | undefined =
    props.searchEngines.length > 0
      ? inferPrimarySearchModeFromEngines(props.searchEngines) ?? undefined
      : isPrimarySearchMode(normalizedSearchMode)
        ? normalizedSearchMode
        : "normal";

  const tabs: [Tab, string][] = [
    ["memory", GPT_SETTINGS_DRAWER_TEXT.tabs.memory],
    ["ingest", GPT_SETTINGS_DRAWER_TEXT.tabs.ingest],
    ["search", GPT_SETTINGS_DRAWER_TEXT.tabs.search],
    ["library", GPT_SETTINGS_DRAWER_TEXT.tabs.library],
    ["rules", GPT_SETTINGS_DRAWER_TEXT.tabs.rules],
    ["protocol", GPT_SETTINGS_DRAWER_TEXT.tabs.protocol],
  ];

  const setSearchPreset = (mode: PrimarySearchMode) => {
    props.onChangeSearchMode(mode as SearchMode);
    props.onChangeSearchEngines([...SEARCH_MODE_PRESETS[mode].engines]);
  };

  React.useEffect(() => {
    setSourceDisplayCountInput(String(props.sourceDisplayCount));
  }, [props.sourceDisplayCount]);

  const toggleSearchEngine = (engine: SearchEngine) => {
    const next = props.searchEngines.includes(engine)
      ? props.searchEngines.filter((item) => item !== engine)
      : [...props.searchEngines, engine];
    props.onChangeSearchEngines(next);
    const inferred = inferPrimarySearchModeFromEngines(next);
    if (inferred) props.onChangeSearchMode(inferred as SearchMode);
  };

  const commitSourceDisplayCount = () => {
    const normalized = sourceDisplayCountInput.replace(/[^\d]/g, "").trim();
    const nextValue = Math.max(1, Math.min(20, Number(normalized || props.sourceDisplayCount || 1)));
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
        <>
          <div style={sectionCard}>
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
                onChange={(v) => props.onFieldChange("maxFacts", v)}
                help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxFacts}
              />
              <NumberField
                label="MAX_PREFERENCES"
                value={props.localSettings.maxPreferences}
                onChange={(v) => props.onFieldChange("maxPreferences", v)}
                help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxPreferences}
              />
              <NumberField
                label="CHAT_RECENT_LIMIT"
                value={props.localSettings.chatRecentLimit}
                onChange={(v) => props.onFieldChange("chatRecentLimit", v)}
                help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.chatRecentLimit}
              />
              <NumberField
                label="SUMMARIZE_THRESHOLD"
                value={props.localSettings.summarizeThreshold}
                onChange={(v) => props.onFieldChange("summarizeThreshold", v)}
                help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.summarizeThreshold}
              />
              <NumberField
                label="RECENT_KEEP"
                value={props.localSettings.recentKeep}
                onChange={(v) => props.onFieldChange("recentKeep", v)}
                help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.recentKeep}
              />
              <div>
                <div style={labelStyle}>{GPT_SETTINGS_DRAWER_TEXT.memoryCapacityPreviewLabel}</div>
                <div
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    background: "#f8fafc",
                    fontWeight: 800,
                  }}
                >
                  {GPT_SETTINGS_DRAWER_TEXT.memoryCapacityPreviewPrefix}
                  {props.memoryCapacityPreview}
                </div>
                <div style={helpTextStyle}>{GPT_SETTINGS_DRAWER_TEXT.memoryCapacityPreviewHelp}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button type="button" style={buttonSecondaryWide} onClick={props.onReset}>
              {GPT_SETTINGS_DRAWER_TEXT.reset}
            </button>
            <button type="button" style={buttonPrimary} onClick={props.onSave}>
              {GPT_SETTINGS_DRAWER_TEXT.save}
            </button>
          </div>
        </>
      ) : null}

      {activeTab === "ingest" ? (
        <div style={sectionCard}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={labelStyle}>{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicy}</div>
              <select
                value={props.fileReadPolicy}
                onChange={(e) =>
                  props.onChangeFileReadPolicy(e.target.value as FileReadPolicy)
                }
                style={selectStyle}
              >
                <option value="text_first">{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_first}</option>
                <option value="visual_first">{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.visual_first}</option>
                <option value="text_and_layout">{GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_and_layout}</option>
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: props.isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={subtleCard}>
                <div style={labelStyle}>{GPT_SETTINGS_DRAWER_TEXT.textIngest}</div>
                <select
                  value={props.ingestMode}
                  onChange={(e) =>
                    props.onChangeIngestMode(e.target.value as IngestMode)
                  }
                  style={selectStyle}
                >
                  <option value="compact">compact</option>
                  <option value="detailed">detailed</option>
                  <option value="max">max</option>
                </select>
                <div style={{ marginTop: 8 }}>
                  <NumberField
                    label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                    value={String(props.compactCharLimit)}
                    onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))}
                  />
                </div>
              </div>
              <div style={subtleCard}>
                <div style={labelStyle}>{GPT_SETTINGS_DRAWER_TEXT.imagePdfIngest}</div>
                <select
                  value={props.imageDetail}
                  onChange={(e) =>
                    props.onChangeImageDetail(e.target.value as ImageDetail)
                  }
                  style={selectStyle}
                >
                  <option value="simple">simple</option>
                  <option value="detailed">detailed</option>
                  <option value="max">max</option>
                </select>
                <div style={{ marginTop: 8 }}>
                  <NumberField
                    label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                    value={String(props.simpleImageCharLimit)}
                    onChange={(v) => props.onChangeSimpleImageCharLimit(Number(v || 0))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
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

