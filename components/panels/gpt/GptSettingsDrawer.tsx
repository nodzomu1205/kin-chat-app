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
  ResponseMode,
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
  | "output"
  | "protocol";

type Props = {
  localSettings: LocalMemorySettingsInput;
  onFieldChange: (k: keyof LocalMemorySettingsInput, v: string) => void;
  onReset: () => void;
  onSave: () => void;
  memoryCapacityPreview: number;
  responseMode: ResponseMode;
  onChangeResponseMode: (v: ResponseMode) => void;
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

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.6,
  color: "#0f172a",
  resize: "vertical",
  background: "#fff",
  boxSizing: "border-box",
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
    ["memory", "メモリ"],
    ["ingest", "取込"],
    ["search", "検索"],
    ["library", "ライブラリ"],
    ["rules", "ルール"],
    ["output", "出力"],
    ["protocol", "プロトコル"],
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
                help="facts の最大数"
              />
              <NumberField
                label="MAX_PREFERENCES"
                value={props.localSettings.maxPreferences}
                onChange={(v) => props.onFieldChange("maxPreferences", v)}
                help="preferences の最大数"
              />
              <NumberField
                label="CHAT_RECENT_LIMIT"
                value={props.localSettings.chatRecentLimit}
                onChange={(v) => props.onFieldChange("chatRecentLimit", v)}
                help="recentMessages の保持数"
              />
              <NumberField
                label="SUMMARIZE_THRESHOLD"
                value={props.localSettings.summarizeThreshold}
                onChange={(v) => props.onFieldChange("summarizeThreshold", v)}
                help="要約を始める閾値"
              />
              <NumberField
                label="RECENT_KEEP"
                value={props.localSettings.recentKeep}
                onChange={(v) => props.onFieldChange("recentKeep", v)}
                help="要約後に残す recentMessages 数"
              />
              <div>
                <div style={labelStyle}>メモリ容量プレビュー</div>
                <div
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    background: "#f8fafc",
                    fontWeight: 800,
                  }}
                >
                  合計 {props.memoryCapacityPreview}
                </div>
                <div style={helpTextStyle}>recent + facts + preferences</div>
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
              リセット
            </button>
            <button type="button" style={buttonPrimary} onClick={props.onSave}>
              保存
            </button>
          </div>
        </>
      ) : null}

      {activeTab === "ingest" ? (
        <div style={sectionCard}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={labelStyle}>ファイル読み取り方針</div>
              <select
                value={props.fileReadPolicy}
                onChange={(e) =>
                  props.onChangeFileReadPolicy(e.target.value as FileReadPolicy)
                }
                style={selectStyle}
              >
                <option value="text_first">テキスト優先</option>
                <option value="visual_first">見た目優先</option>
                <option value="text_and_layout">両方</option>
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
                <div style={labelStyle}>テキスト取込</div>
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
                    label="文字数上限"
                    value={String(props.compactCharLimit)}
                    onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))}
                  />
                </div>
              </div>
              <div style={subtleCard}>
                <div style={labelStyle}>画像 / PDF 取込</div>
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
                    label="文字数上限"
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

      {activeTab === "output" ? (
        <div style={sectionCard}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>出力モード</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["creative", "strict"] as ResponseMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                style={tabButton(props.responseMode === mode)}
                onClick={() => props.onChangeResponseMode(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ ...helpTextStyle, marginTop: 8 }}>
            `Balanced` は旧互換モードで、現在は `Strict` と同じ扱いです。混乱防止のため表示を外しています。
          </div>
        </div>
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
