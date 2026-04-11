"use client";

import React from "react";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/taskIntent";
import {
  inferPrimarySearchModeFromEngines,
  isPrimarySearchMode,
  normalizeStoredSearchMode,
  SEARCH_MODE_PRESETS,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";
import type {
  DocumentReferenceMode,
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

export type LocalMemorySettingsInput = {
  maxFacts: string;
  maxPreferences: string;
  chatRecentLimit: string;
  summarizeThreshold: string;
  recentKeep: string;
};

type Tab = "memory" | "ingest" | "search" | "library" | "rules" | "output" | "protocol";

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
  searchHistoryLimit: number;
  searchHistoryStorageMB: number;
  autoDocumentReferenceEnabled: boolean;
  documentReferenceMode: DocumentReferenceMode;
  documentReferenceCount: number;
  documentStorageMB: number;
  documentReferenceEstimatedTokens: number;
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
  onChangeSearchMode: (v: SearchMode) => void;
  onChangeSearchEngines: (v: SearchEngine[]) => void;
  onChangeSearchLocation: (v: string) => void;
  onChangeSearchHistoryLimit: (v: number) => void;
  onClearSearchHistory: () => void;
  onChangeAutoDocumentReferenceEnabled: (v: boolean) => void;
  onChangeDocumentReferenceMode: (v: DocumentReferenceMode) => void;
  onChangeDocumentReferenceCount: (v: number) => void;
  onChangeAutoLibraryReferenceEnabled: (v: boolean) => void;
  onChangeLibraryReferenceMode: (v: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (v: number) => void;
  onChangeLibraryReferenceCount: (v: number) => void;
  onChangeAutoSendKinSysInput: (v: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (v: boolean) => void;
  onChangeAutoSendGptSysInput: (v: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (v: boolean) => void;
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
  onUpdateIntentCandidate: (id: string, patch: Partial<PendingIntentCandidate>) => void;
  onApproveIntentCandidate: (id: string) => void;
  onRejectIntentCandidate: (id: string) => void;
  onUpdateApprovedIntentPhrase: (id: string, patch: Partial<ApprovedIntentPhrase>) => void;
  onDeleteApprovedIntentPhrase: (id: string) => void;
  isMobile?: boolean;
};

const sectionCard: React.CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 12,
  background: "rgba(255,255,255,0.92)",
  padding: 12,
};

const subtleCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fbfdff",
  padding: 12,
};

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  padding: "0 12px",
};

const tabButton = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: 999,
  border: active ? "1px solid #67e8f9" : "1px solid #cbd5e1",
  background: active ? "#ecfeff" : "#fff",
  color: active ? "#155e75" : "#475569",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 12px",
  cursor: "pointer",
  lineHeight: 1,
});

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

function ToggleButtons(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  help?: string;
}) {
  return (
    <div style={subtleCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{props.label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={tabButton(props.checked)} onClick={() => props.onChange(true)}>
          ON
        </button>
        <button type="button" style={tabButton(!props.checked)} onClick={() => props.onChange(false)}>
          OFF
        </button>
      </div>
      {props.help ? <div style={{ ...helpTextStyle, marginTop: 8 }}>{props.help}</div> : null}
    </div>
  );
}

const SEARCH_ENGINES: SearchEngine[] = [
  "google_search",
  "google_ai_mode",
  "google_news",
  "google_local",
];

export default function GptSettingsDrawer(props: Props) {
  const [activeTab, setActiveTab] = React.useState<Tab>("memory");
  const [showApproved, setShowApproved] = React.useState(false);

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
    props.onChangeSearchEngines(
      [...SEARCH_MODE_PRESETS[mode].engines].filter(
        (engine): engine is SearchEngine => engine !== "google_maps"
      )
    );
  };

  const toggleSearchEngine = (engine: SearchEngine) => {
    const next = props.searchEngines.includes(engine)
      ? props.searchEngines.filter((item) => item !== engine)
      : [...props.searchEngines, engine];
    props.onChangeSearchEngines(next);
    const inferred = inferPrimarySearchModeFromEngines(next);
    if (inferred) props.onChangeSearchMode(inferred as SearchMode);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map(([key, label]) => (
          <button key={key} type="button" style={tabButton(activeTab === key)} onClick={() => setActiveTab(key)}>
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
                gridTemplateColumns: props.isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <NumberField label="MAX_FACTS" value={props.localSettings.maxFacts} onChange={(v) => props.onFieldChange("maxFacts", v)} help="facts の最大数" />
              <NumberField label="MAX_PREFERENCES" value={props.localSettings.maxPreferences} onChange={(v) => props.onFieldChange("maxPreferences", v)} help="preferences の最大数" />
              <NumberField label="CHAT_RECENT_LIMIT" value={props.localSettings.chatRecentLimit} onChange={(v) => props.onFieldChange("chatRecentLimit", v)} help="recentMessages の保持数" />
              <NumberField label="SUMMARIZE_THRESHOLD" value={props.localSettings.summarizeThreshold} onChange={(v) => props.onFieldChange("summarizeThreshold", v)} help="要約を始める閾値" />
              <NumberField label="RECENT_KEEP" value={props.localSettings.recentKeep} onChange={(v) => props.onFieldChange("recentKeep", v)} help="要約後に残す recentMessages 数" />
              <div>
                <div style={labelStyle}>メモリ容量プレビュー</div>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 800 }}>
                  合計 {props.memoryCapacityPreview}
                </div>
                <div style={helpTextStyle}>recent + facts + preferences</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" style={buttonSecondaryWide} onClick={props.onReset}>リセット</button>
            <button type="button" style={buttonPrimary} onClick={props.onSave}>保存</button>
          </div>
        </>
      ) : null}

      {activeTab === "ingest" ? (
        <div style={sectionCard}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={labelStyle}>ファイル読み取り方針</div>
              <select value={props.fileReadPolicy} onChange={(e) => props.onChangeFileReadPolicy(e.target.value as FileReadPolicy)} style={selectStyle}>
                <option value="text_first">テキスト優先</option>
                <option value="visual_first">見た目優先</option>
                <option value="text_and_layout">両方</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: props.isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div style={subtleCard}>
                <div style={labelStyle}>テキスト取込</div>
                <select value={props.ingestMode} onChange={(e) => props.onChangeIngestMode(e.target.value as IngestMode)} style={selectStyle}>
                  <option value="compact">compact</option>
                  <option value="detailed">detailed</option>
                  <option value="max">max</option>
                </select>
                <div style={{ marginTop: 8 }}>
                  <NumberField label="文字数上限" value={String(props.compactCharLimit)} onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))} />
                </div>
              </div>
              <div style={subtleCard}>
                <div style={labelStyle}>画像 / PDF 取込</div>
                <select value={props.imageDetail} onChange={(e) => props.onChangeImageDetail(e.target.value as ImageDetail)} style={selectStyle}>
                  <option value="simple">simple</option>
                  <option value="detailed">detailed</option>
                  <option value="max">max</option>
                </select>
                <div style={{ marginTop: 8 }}>
                  <NumberField label="文字数上限" value={String(props.simpleImageCharLimit)} onChange={(v) => props.onChangeSimpleImageCharLimit(Number(v || 0))} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "search" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={sectionCard}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>検索プリセット</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["normal", "ai", "integrated", "news", "geo"] as PrimarySearchMode[]).map((mode) => (
                <button key={mode} type="button" style={tabButton(activeSearchMode === mode)} onClick={() => setSearchPreset(mode)}>
                  {mode === "normal" ? "通常" : mode === "ai" ? "AI" : mode === "integrated" ? "統合" : mode === "news" ? "News" : "Local"}
                </button>
              ))}
            </div>
          </div>
          <div style={sectionCard}>
            <div style={{ display: "grid", gridTemplateColumns: props.isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <div style={labelStyle}>Location</div>
                <input value={props.searchLocation} onChange={(e) => props.onChangeSearchLocation(e.target.value)} placeholder="例: Japan / Johannesburg, South Africa" style={inputStyle} />
                <div style={helpTextStyle}>Protocol の `LOCATION` も自然な地名で指定します。</div>
              </div>
              <div>
                <div style={labelStyle}>Engines</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {SEARCH_ENGINES.map((engine) => (
                    <button key={engine} type="button" style={tabButton(props.searchEngines.includes(engine))} onClick={() => toggleSearchEngine(engine)}>
                      {engine}
                    </button>
                  ))}
                </div>
                <div style={helpTextStyle}>Protocol では `google_search / google_ai_mode / google_news / google_local` を使用します。</div>
              </div>
            </div>
          </div>
          <div style={sectionCard}>
            <div style={{ display: "grid", gridTemplateColumns: props.isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <div style={labelStyle}>検索履歴保持数</div>
                <input inputMode="numeric" value={String(props.searchHistoryLimit)} onChange={(e) => props.onChangeSearchHistoryLimit(Number(e.target.value.replace(/[^\d]/g, "") || 1))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>検索履歴サイズ</div>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 800 }}>
                  {props.searchHistoryStorageMB.toFixed(3)} MB
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <button type="button" style={buttonSecondaryWide} onClick={props.onClearSearchHistory}>検索履歴をクリア</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "library" ? (
        <div style={sectionCard}>
          <div style={{ display: "grid", gridTemplateColumns: props.isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <ToggleButtons label="文書自動参照" checked={props.autoDocumentReferenceEnabled} onChange={props.onChangeAutoDocumentReferenceEnabled} />
            <ToggleButtons label="ライブラリ自動参照" checked={props.autoLibraryReferenceEnabled} onChange={props.onChangeAutoLibraryReferenceEnabled} />
            <div style={subtleCard}>
              <div style={labelStyle}>文書参照モード</div>
              <select value={props.documentReferenceMode} onChange={(e) => props.onChangeDocumentReferenceMode(e.target.value as DocumentReferenceMode)} style={selectStyle}>
                <option value="summary_only">summary only</option>
                <option value="summary_with_excerpt">summary + excerpt</option>
              </select>
            </div>
            <div style={subtleCard}>
              <div style={labelStyle}>ライブラリ参照モード</div>
              <select value={props.libraryReferenceMode} onChange={(e) => props.onChangeLibraryReferenceMode(e.target.value as LibraryReferenceMode)} style={selectStyle}>
                <option value="summary_only">summary only</option>
                <option value="summary_with_excerpt">summary + excerpt</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>文書参照件数</div>
              <input inputMode="numeric" value={String(props.documentReferenceCount)} onChange={(e) => props.onChangeDocumentReferenceCount(Number(e.target.value.replace(/[^\d]/g, "") || 1))} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>ライブラリ index 件数</div>
              <input inputMode="numeric" value={String(props.libraryIndexResponseCount)} onChange={(e) => props.onChangeLibraryIndexResponseCount(Number(e.target.value.replace(/[^\d]/g, "") || 1))} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>ライブラリ参照件数</div>
              <input inputMode="numeric" value={String(props.libraryReferenceCount)} onChange={(e) => props.onChangeLibraryReferenceCount(Number(e.target.value.replace(/[^\d]/g, "") || 0))} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>文書容量</div>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 800 }}>{props.documentStorageMB.toFixed(3)} MB</div>
            </div>
            <div>
              <div style={labelStyle}>文書推定トークン</div>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 800 }}>約 {props.documentReferenceEstimatedTokens}</div>
            </div>
            <div>
              <div style={labelStyle}>ライブラリ容量</div>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 800 }}>{props.libraryStorageMB.toFixed(3)} MB</div>
            </div>
            <div>
              <div style={labelStyle}>ライブラリ推定トークン</div>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 800 }}>約 {props.libraryReferenceEstimatedTokens}</div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "rules" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={sectionCard}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>承認待ちルール</div>
            {props.pendingIntentCandidates.length === 0 ? (
              <div style={helpTextStyle}>現在、承認待ちルールはありません。</div>
            ) : (
              props.pendingIntentCandidates.map((candidate) => (
                <div key={candidate.id} style={{ ...subtleCard, marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{candidate.kind} / {candidate.phrase}</div>
                  <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>{candidate.sourceText}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button type="button" style={buttonPrimary} onClick={() => props.onApproveIntentCandidate(candidate.id)}>承認</button>
                    <button type="button" style={buttonSecondaryWide} onClick={() => props.onRejectIntentCandidate(candidate.id)}>却下</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={sectionCard}>
            <button type="button" style={tabButton(showApproved)} onClick={() => setShowApproved((prev) => !prev)}>
              {showApproved ? "承認済みルールを閉じる" : `承認済みルールを表示 (${props.approvedIntentPhrases.length})`}
            </button>
            {showApproved ? (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {props.approvedIntentPhrases.map((phrase) => (
                  <div key={phrase.id} style={subtleCard}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{phrase.kind} / {phrase.phrase}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <div style={helpTextStyle}>作成日: {phrase.createdAt.slice(0, 10)}</div>
                      <button type="button" style={buttonSecondaryWide} onClick={() => props.onDeleteApprovedIntentPhrase(phrase.id)}>削除</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "output" ? (
        <div style={sectionCard}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>出力モード</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["creative", "balanced", "strict"] as ResponseMode[]).map((mode) => (
              <button key={mode} type="button" style={tabButton(props.responseMode === mode)} onClick={() => props.onChangeResponseMode(mode)}>
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "protocol" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={sectionCard}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>自動化</div>
            <div style={{ display: "grid", gap: 10 }}>
              <ToggleButtons label="A. Kin入力欄の SYS を自動送信" checked={props.autoSendKinSysInput} onChange={props.onChangeAutoSendKinSysInput} help="Kin入力欄に SYS ブロックが入ったら自動送信します。" />
              <ToggleButtons label="B. Kin最新レスの SYS を GPT入力欄へ自動転記" checked={props.autoCopyKinSysResponseToGpt} onChange={props.onChangeAutoCopyKinSysResponseToGpt} help="Kin の最新メッセージが SYS ブロックなら GPT入力欄へ下書き転記します。" />
              <ToggleButtons label="C. GPT入力欄の SYS を自動送信" checked={props.autoSendGptSysInput} onChange={props.onChangeAutoSendGptSysInput} help="GPT入力欄に SYS ブロックが入ったら自動送信します。" />
              <ToggleButtons label="D. GPT最新レスの SYS を Kin入力欄へ自動転記" checked={props.autoCopyGptSysResponseToKin} onChange={props.onChangeAutoCopyGptSysResponseToKin} help="GPT の最新メッセージが SYS ブロックなら Kin入力欄へ下書き転記します。" />
            </div>
          </div>
          <div style={sectionCard}>
            <div style={labelStyle}>Prompt</div>
            <textarea value={props.protocolPrompt} onChange={(e) => props.onChangeProtocolPrompt(e.target.value)} style={{ width: "100%", minHeight: 120, border: "1px solid #d1d5db", borderRadius: 12, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "#0f172a", resize: "vertical", background: "#fff", boxSizing: "border-box" }} />
          </div>
          <div style={sectionCard}>
            <div style={labelStyle}>Rulebook</div>
            <textarea value={props.protocolRulebook} onChange={(e) => props.onChangeProtocolRulebook(e.target.value)} style={{ width: "100%", minHeight: 260, border: "1px solid #d1d5db", borderRadius: 12, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "#0f172a", resize: "vertical", background: "#fff", boxSizing: "border-box" }} />
            <div style={{ ...helpTextStyle, marginTop: 8 }}>
              検索プロトコルでは `ENGINE: google_search / google_ai_mode / google_news / google_local` と `LOCATION: Japan` のような自然な地名表記を使います。
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" style={buttonSecondaryWide} onClick={props.onResetProtocolDefaults}>既定値に戻す</button>
            <button type="button" style={buttonSecondaryWide} onClick={props.onSaveProtocolDefaults}>既定値として保存</button>
            <button type="button" style={buttonSecondaryWide} onClick={() => void props.onSetProtocolRulebookToKinDraft()}>Kin入力欄へセット</button>
            <button type="button" style={buttonPrimary} onClick={() => void props.onSendProtocolRulebookToKin()}>SYS_INFO として送信</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
