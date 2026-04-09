import React from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type {
  DocumentReferenceMode,
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  LibraryReferenceMode,
  ResponseMode,
  SearchReferenceMode,
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

type Props = {
  localSettings: LocalMemorySettingsInput;
  onFieldChange: (key: keyof LocalMemorySettingsInput, value: string) => void;
  onReset: () => void;
  onSave: () => void;
  memoryCapacityPreview: number;
  responseMode: ResponseMode;
  onChangeResponseMode: (mode: ResponseMode) => void;
  ingestMode: IngestMode;
  onChangeIngestMode: (mode: IngestMode) => void;
  imageDetail: ImageDetail;
  onChangeImageDetail: (detail: ImageDetail) => void;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeCompactCharLimit: (value: number) => void;
  onChangeSimpleImageCharLimit: (value: number) => void;
  fileReadPolicy: FileReadPolicy;
  onChangeFileReadPolicy: (policy: FileReadPolicy) => void;
  autoSearchReferenceEnabled: boolean;
  searchReferenceMode: SearchReferenceMode;
  searchReferenceCount: number;
  searchHistoryLimit: number;
  searchHistoryStorageMB: number;
  searchReferenceEstimatedTokens: number;
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
  onChangeAutoSearchReferenceEnabled: (value: boolean) => void;
  onChangeSearchReferenceMode: (value: SearchReferenceMode) => void;
  onChangeSearchReferenceCount: (value: number) => void;
  onChangeSearchHistoryLimit: (value: number) => void;
  onClearSearchHistory: () => void;
  onChangeAutoDocumentReferenceEnabled: (value: boolean) => void;
  onChangeDocumentReferenceMode: (value: DocumentReferenceMode) => void;
  onChangeDocumentReferenceCount: (value: number) => void;
  onChangeAutoLibraryReferenceEnabled: (value: boolean) => void;
  onChangeLibraryReferenceMode: (value: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (value: number) => void;
  onChangeLibraryReferenceCount: (value: number) => void;
  protocolPrompt: string;
  protocolRulebook: string;
  onChangeProtocolPrompt: (value: string) => void;
  onChangeProtocolRulebook: (value: string) => void;
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  onUpdateIntentCandidate: (
    candidateId: string,
    patch: Partial<PendingIntentCandidate>
  ) => void;
  onApproveIntentCandidate: (candidateId: string) => void;
  onRejectIntentCandidate: (candidateId: string) => void;
  isMobile?: boolean;
};

const sectionCard: React.CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 12,
  background: "rgba(255,255,255,0.92)",
  padding: 12,
};

const choiceButton = (active: boolean): React.CSSProperties => ({
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

const compactInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 96,
  minWidth: 96,
  textAlign: "center",
  padding: "8px 10px",
};

function SettingNumberField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      <div style={helpTextStyle}>{help}</div>
    </div>
  );
}

export default function GptSettingsDrawer({
  localSettings,
  onFieldChange,
  onReset,
  onSave,
  memoryCapacityPreview,
  responseMode,
  onChangeResponseMode,
  ingestMode,
  onChangeIngestMode,
  imageDetail,
  onChangeImageDetail,
  compactCharLimit,
  simpleImageCharLimit,
  onChangeCompactCharLimit,
  onChangeSimpleImageCharLimit,
  fileReadPolicy,
  onChangeFileReadPolicy,
  autoLibraryReferenceEnabled,
  libraryReferenceMode,
  libraryIndexResponseCount,
  libraryReferenceCount,
  libraryStorageMB,
  libraryReferenceEstimatedTokens,
  onChangeAutoLibraryReferenceEnabled,
  onChangeLibraryReferenceMode,
  onChangeLibraryIndexResponseCount,
  onChangeLibraryReferenceCount,
  protocolPrompt,
  protocolRulebook,
  onChangeProtocolPrompt,
  onChangeProtocolRulebook,
  onResetProtocolDefaults,
  onSaveProtocolDefaults,
  onSetProtocolRulebookToKinDraft,
  onSendProtocolRulebookToKin,
  pendingIntentCandidates,
  approvedIntentPhrases,
  onUpdateIntentCandidate,
  onApproveIntentCandidate,
  onRejectIntentCandidate,
  isMobile = false,
}: Props) {
  const [localLibraryReferenceCount, setLocalLibraryReferenceCount] = React.useState(
    String(libraryReferenceCount)
  );
  const [localLibraryIndexResponseCount, setLocalLibraryIndexResponseCount] = React.useState(
    String(libraryIndexResponseCount)
  );

  React.useEffect(() => {
    setLocalLibraryReferenceCount(String(libraryReferenceCount));
  }, [libraryReferenceCount]);

  React.useEffect(() => {
    setLocalLibraryIndexResponseCount(String(libraryIndexResponseCount));
  }, [libraryIndexResponseCount]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>応答モード</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={choiceButton(responseMode === "strict")} onClick={() => onChangeResponseMode("strict")}>
            STRICT
          </button>
          <button type="button" style={choiceButton(responseMode === "creative")} onClick={() => onChangeResponseMode("creative")}>
            CREATIVE
          </button>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>ファイル読取方針</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={choiceButton(fileReadPolicy === "text_first")} onClick={() => onChangeFileReadPolicy("text_first")}>
            テキスト優先
          </button>
          <button type="button" style={choiceButton(fileReadPolicy === "visual_first")} onClick={() => onChangeFileReadPolicy("visual_first")}>
            見た目優先
          </button>
          <button type="button" style={choiceButton(fileReadPolicy === "text_and_layout")} onClick={() => onChangeFileReadPolicy("text_and_layout")}>
            両方
          </button>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>テキスト / 画像読取設定</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fbfdff", padding: 12, display: "grid", gap: 8 }}>
            <div style={labelStyle}>テキスト読取</div>
            <select value={ingestMode} onChange={(e) => onChangeIngestMode(e.target.value as IngestMode)} style={selectStyle}>
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </select>
            <div style={labelStyle}>文字数制限</div>
            <input inputMode="numeric" value={String(compactCharLimit)} onChange={(e) => onChangeCompactCharLimit(Number(e.target.value || 0))} style={compactInputStyle} />
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fbfdff", padding: 12, display: "grid", gap: 8 }}>
            <div style={labelStyle}>画像 / PDF読取</div>
            <select value={imageDetail} onChange={(e) => onChangeImageDetail(e.target.value as ImageDetail)} style={selectStyle}>
              <option value="simple">simple</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </select>
            <div style={labelStyle}>文字数制限</div>
            <input inputMode="numeric" value={String(simpleImageCharLimit)} onChange={(e) => onChangeSimpleImageCharLimit(Number(e.target.value || 0))} style={compactInputStyle} />
          </div>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>ライブラリ参照</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fbfdff", padding: 12 }}>
            <div style={labelStyle}>自動参照</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, color: "#334155", fontWeight: 700, fontSize: 13 }}>
              <input type="checkbox" checked={autoLibraryReferenceEnabled} onChange={(e) => onChangeAutoLibraryReferenceEnabled(e.target.checked)} />
              会話中にライブラリを参照
            </label>
          </div>
          <div>
            <div style={labelStyle}>参照モード</div>
            <select value={libraryReferenceMode} onChange={(e) => onChangeLibraryReferenceMode(e.target.value as LibraryReferenceMode)} style={selectStyle}>
              <option value="summary_only">summary only</option>
              <option value="summary_with_excerpt">summary + excerpt</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>索引返答件数</div>
            <input
              inputMode="numeric"
              value={localLibraryIndexResponseCount}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, "");
                setLocalLibraryIndexResponseCount(digits);
                if (digits !== "") onChangeLibraryIndexResponseCount(Number(digits));
              }}
              onBlur={() => {
                const normalized = String(Math.max(1, Number(localLibraryIndexResponseCount || 1)));
                setLocalLibraryIndexResponseCount(normalized);
                onChangeLibraryIndexResponseCount(Number(normalized));
              }}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>自動参照件数</div>
            <input
              inputMode="numeric"
              value={localLibraryReferenceCount}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, "");
                setLocalLibraryReferenceCount(digits);
                if (digits !== "") onChangeLibraryReferenceCount(Number(digits));
              }}
              onBlur={() => {
                const normalized = String(Math.max(0, Number(localLibraryReferenceCount || 0)));
                setLocalLibraryReferenceCount(normalized);
                onChangeLibraryReferenceCount(Number(normalized));
              }}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>保存容量</div>
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", fontWeight: 800, color: "#334155", background: "#f8fafc" }}>
              {libraryStorageMB.toFixed(3)} MB
            </div>
          </div>
          <div>
            <div style={labelStyle}>概算追加トークン</div>
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", fontWeight: 800, color: "#334155", background: "#f8fafc" }}>
              約 {libraryReferenceEstimatedTokens}
            </div>
          </div>
        </div>
        <div style={helpTextStyle}>
          Kin作成書類・注入書類・検索データを、同じ優先順で会話文脈に取り込みます。
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>承認待ち抽出候補</div>
        {pendingIntentCandidates.length === 0 ? (
          <div style={helpTextStyle}>現在、承認待ちの抽出候補はありません。</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pendingIntentCandidates.map((candidate) => (
              <div key={candidate.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fbfdff", padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                  {candidate.kind} / {candidate.phrase}
                </div>
                {candidate.kind === "char_limit" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <div style={labelStyle}>rule</div>
                    <select
                      value={candidate.rule ?? "around"}
                      onChange={(e) => onUpdateIntentCandidate(candidate.id, { rule: e.target.value as PendingIntentCandidate["rule"] })}
                      style={{ ...selectStyle, minWidth: 120 }}
                    >
                      <option value="exact">exact</option>
                      <option value="at_least">at_least</option>
                      <option value="up_to">up_to</option>
                      <option value="around">around</option>
                    </select>
                    <div style={labelStyle}>charLimit</div>
                    <input
                      inputMode="numeric"
                      value={String(candidate.charLimit ?? "")}
                      onChange={(e) =>
                        onUpdateIntentCandidate(candidate.id, {
                          charLimit: Number(e.target.value.replace(/[^\d]/g, "") || 0) || undefined,
                        })
                      }
                      style={{ ...compactInputStyle, width: 110, minWidth: 110 }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <div style={labelStyle}>count</div>
                    <input
                      inputMode="numeric"
                      value={String(candidate.count ?? "")}
                      onChange={(e) =>
                        onUpdateIntentCandidate(candidate.id, {
                          count: Number(e.target.value.replace(/[^\d]/g, "") || 0) || undefined,
                        })
                      }
                      style={{ ...compactInputStyle, width: 90, minWidth: 90 }}
                    />
                    <div style={labelStyle}>rule</div>
                    <select
                      value={candidate.rule ?? "exact"}
                      onChange={(e) => onUpdateIntentCandidate(candidate.id, { rule: e.target.value as PendingIntentCandidate["rule"] })}
                      style={{ ...selectStyle, minWidth: 120 }}
                    >
                      <option value="exact">exact</option>
                      <option value="at_least">at_least</option>
                      <option value="up_to">up_to</option>
                      <option value="around">around</option>
                    </select>
                  </div>
                )}
                <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>{candidate.sourceText}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button type="button" style={buttonPrimary} onClick={() => onApproveIntentCandidate(candidate.id)}>
                    承認
                  </button>
                  <button type="button" style={buttonSecondaryWide} onClick={() => onRejectIntentCandidate(candidate.id)}>
                    却下
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ ...helpTextStyle, marginTop: 10 }}>
          承認済みフレーズ: {approvedIntentPhrases.length}件
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>メモリキャパ設定</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <SettingNumberField label="MAX_FACTS" value={localSettings.maxFacts} onChange={(v) => onFieldChange("maxFacts", v)} help="facts の最大数" />
          <SettingNumberField label="MAX_PREFERENCES" value={localSettings.maxPreferences} onChange={(v) => onFieldChange("maxPreferences", v)} help="preferences の最大数" />
          <SettingNumberField label="CHAT_RECENT_LIMIT" value={localSettings.chatRecentLimit} onChange={(v) => onFieldChange("chatRecentLimit", v)} help="recentMessages の保存数" />
          <SettingNumberField label="SUMMARIZE_THRESHOLD" value={localSettings.summarizeThreshold} onChange={(v) => onFieldChange("summarizeThreshold", v)} help="要約へ切り替える閾値" />
          <SettingNumberField label="RECENT_KEEP" value={localSettings.recentKeep} onChange={(v) => onFieldChange("recentKeep", v)} help="要約後に残す recentMessages 数" />
          <div>
            <div style={labelStyle}>メモリ容量</div>
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", fontWeight: 800, color: "#334155", background: "#f8fafc" }}>
              合計 {memoryCapacityPreview}
            </div>
            <div style={helpTextStyle}>chat recent + facts + preferences の合計</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button type="button" style={buttonSecondaryWide} onClick={onReset}>
          リセット
        </button>
        <button type="button" style={buttonPrimary} onClick={onSave}>
          保存
        </button>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Protocol</div>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={labelStyle}>Prompt</div>
            <textarea value={protocolPrompt} onChange={(e) => onChangeProtocolPrompt(e.target.value)} style={{ width: "100%", minHeight: 120, border: "1px solid #d1d5db", borderRadius: 12, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "#0f172a", resize: "vertical", background: "#fff", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={labelStyle}>Rulebook</div>
            <textarea value={protocolRulebook} onChange={(e) => onChangeProtocolRulebook(e.target.value)} style={{ width: "100%", minHeight: 220, border: "1px solid #d1d5db", borderRadius: 12, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "#0f172a", resize: "vertical", background: "#fff", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" style={buttonSecondaryWide} onClick={onResetProtocolDefaults}>
              既定値に戻す
            </button>
            <button type="button" style={buttonSecondaryWide} onClick={onSaveProtocolDefaults}>
              今を既定値に保存
            </button>
            <button type="button" style={buttonSecondaryWide} onClick={() => void onSetProtocolRulebookToKinDraft()}>
              Kin送信欄にセット
            </button>
            <button type="button" style={buttonPrimary} onClick={() => void onSendProtocolRulebookToKin()}>
              SYS_INFOとして送る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
