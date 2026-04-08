import React from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
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

type LocalMemorySettingsInput = {
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
  onChangeAutoSearchReferenceEnabled: (value: boolean) => void;
  onChangeSearchReferenceMode: (value: SearchReferenceMode) => void;
  onChangeSearchReferenceCount: (value: number) => void;
  onChangeSearchHistoryLimit: (value: number) => void;
  onClearSearchHistory: () => void;
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
  width: 92,
  minWidth: 92,
  textAlign: "center",
  padding: "8px 10px",
};

function LimitControlRow({
  title,
  selectValue,
  onChangeSelect,
  limitValue,
  onChangeLimit,
  options,
  isMobile,
}: {
  title: string;
  selectValue: string;
  onChangeSelect: (value: string) => void;
  limitValue: number;
  onChangeLimit: (value: number) => void;
  options: Array<{ value: string; label: string }>;
  isMobile: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
      <div style={labelStyle}>{title}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: isMobile ? "wrap" : "nowrap",
        }}
      >
        <select
          value={selectValue}
          onChange={(e) => onChangeSelect(e.target.value)}
          style={{ ...selectStyle, flex: isMobile ? "1 1 100%" : "0 1 170px" }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span style={{ ...labelStyle, marginBottom: 0, color: "#475569" }}>
            上限文字数
          </span>
          <input
            inputMode="numeric"
            value={String(limitValue)}
            onChange={(e) => onChangeLimit(Number(e.target.value || 0))}
            style={compactInputStyle}
          />
        </div>
      </div>
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
  autoSearchReferenceEnabled,
  searchReferenceMode,
  searchReferenceCount,
  searchHistoryLimit,
  searchHistoryStorageMB,
  searchReferenceEstimatedTokens,
  onChangeAutoSearchReferenceEnabled,
  onChangeSearchReferenceMode,
  onChangeSearchReferenceCount,
  onChangeSearchHistoryLimit,
  onClearSearchHistory,
  pendingIntentCandidates,
  approvedIntentPhrases,
  onUpdateIntentCandidate,
  onApproveIntentCandidate,
  onRejectIntentCandidate,
  isMobile = false,
}: Props) {
  const [localSearchReferenceCount, setLocalSearchReferenceCount] = React.useState(
    String(searchReferenceCount)
  );
  const [localSearchHistoryLimit, setLocalSearchHistoryLimit] = React.useState(
    String(searchHistoryLimit)
  );

  React.useEffect(() => {
    setLocalSearchReferenceCount(String(searchReferenceCount));
  }, [searchReferenceCount]);

  React.useEffect(() => {
    setLocalSearchHistoryLimit(String(searchHistoryLimit));
  }, [searchHistoryLimit]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>検索モード切替</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={choiceButton(responseMode === "strict")}
            onClick={() => onChangeResponseMode("strict")}
          >
            STRICT
          </button>
          <button
            type="button"
            style={choiceButton(responseMode === "creative")}
            onClick={() => onChangeResponseMode("creative")}
          >
            CREATIVE
          </button>
        </div>
        <div style={{ ...helpTextStyle, marginTop: 10, lineHeight: 1.7 }}>
          STRICT は推測を絞り、分かること / 分からないことを分けやすい設定です。CREATIVE は自然文寄りで、読みやすさ重視です。
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>ファイル読込方針</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={choiceButton(fileReadPolicy === "text_first")}
            onClick={() => onChangeFileReadPolicy("text_first")}
          >
            文字優先
          </button>
          <button
            type="button"
            style={choiceButton(fileReadPolicy === "visual_first")}
            onClick={() => onChangeFileReadPolicy("visual_first")}
          >
            視覚優先
          </button>
          <button
            type="button"
            style={choiceButton(fileReadPolicy === "text_and_layout")}
            onClick={() => onChangeFileReadPolicy("text_and_layout")}
          >
            統合
          </button>
        </div>
        <div style={{ ...helpTextStyle, marginTop: 10, lineHeight: 1.7 }}>
          文字中心のPDFは「文字優先」、図表や写真中心の資料は「視覚優先」、スライドやイメージ付き資料は「統合」が基準です。
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>テキスト・画像圧縮設定</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fbfdff",
            }}
          >
            <LimitControlRow
              title="テキスト読込"
              selectValue={ingestMode}
              onChangeSelect={(value) => onChangeIngestMode(value as IngestMode)}
              limitValue={compactCharLimit}
              onChangeLimit={onChangeCompactCharLimit}
              options={[
                { value: "compact", label: "compact" },
                { value: "detailed", label: "detailed" },
                { value: "max", label: "max" },
              ]}
              isMobile={isMobile}
            />
            <div style={helpTextStyle}>
              compact は上限文字数を目安に圧縮します。detailed は中間、max は可能な限り保持します。
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fbfdff",
            }}
          >
            <LimitControlRow
              title="画像 / PDF読込"
              selectValue={imageDetail}
              onChangeSelect={(value) => onChangeImageDetail(value as ImageDetail)}
              limitValue={simpleImageCharLimit}
              onChangeLimit={onChangeSimpleImageCharLimit}
              options={[
                { value: "simple", label: "simple" },
                { value: "detailed", label: "detailed" },
                { value: "max", label: "max" },
              ]}
              isMobile={isMobile}
            />
            <div style={helpTextStyle}>
              simple は上限文字数を目安に整えます。detailed は中間、max は必要情報を広めに残します。
            </div>
          </div>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>検索結果参照</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fbfdff",
              padding: "10px 12px",
              minHeight: 74,
            }}
          >
            <div style={labelStyle}>自動参照</div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                color: "#334155",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={autoSearchReferenceEnabled}
                onChange={(e) => onChangeAutoSearchReferenceEnabled(e.target.checked)}
              />
              最新検索を通常チャットへ補助注入
            </label>
          </div>

          <div>
            <div style={labelStyle}>参照モード</div>
            <select
              value={searchReferenceMode}
              onChange={(e) => onChangeSearchReferenceMode(e.target.value as SearchReferenceMode)}
              style={selectStyle}
            >
              <option value="summary_only">summary only</option>
              <option value="summary_with_raw_excerpt">summary + raw excerpt</option>
            </select>
            <div style={helpTextStyle}>通常チャットへ混ぜる検索文脈の深さ</div>
          </div>
          <div>
            <div style={labelStyle}>自動参照件数</div>
            <input
              inputMode="numeric"
              value={localSearchReferenceCount}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, "");
                setLocalSearchReferenceCount(digits);
                if (digits) onChangeSearchReferenceCount(Number(digits));
              }}
              onBlur={() => {
                const normalized = String(Math.max(1, Number(localSearchReferenceCount || 1)));
                setLocalSearchReferenceCount(normalized);
                onChangeSearchReferenceCount(Number(normalized));
              }}
              style={inputStyle}
            />
            <div style={helpTextStyle}>通常チャットに混ぜる最新検索件数</div>
          </div>

          <div>
            <div style={labelStyle}>保存件数</div>
            <input
              inputMode="numeric"
              value={localSearchHistoryLimit}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, "");
                setLocalSearchHistoryLimit(digits);
                if (digits) onChangeSearchHistoryLimit(Number(digits));
              }}
              onBlur={() => {
                const normalized = String(Math.max(1, Number(localSearchHistoryLimit || 1)));
                setLocalSearchHistoryLimit(normalized);
                onChangeSearchHistoryLimit(Number(normalized));
              }}
              style={inputStyle}
            />
            <div style={helpTextStyle}>ローカル保持する検索履歴の最大件数</div>
          </div>
          <div>
            <div style={labelStyle}>保存容量</div>
            <div
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                fontWeight: 800,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              {searchHistoryStorageMB.toFixed(3)} MB
            </div>
            <div style={helpTextStyle}>検索履歴 raw を含むローカル保存量の目安</div>
          </div>
          <div>
            <div style={labelStyle}>概算追加トークン</div>
            <div
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                fontWeight: 800,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              約 {searchReferenceEstimatedTokens}
            </div>
            <div style={helpTextStyle}>現在の自動参照設定で通常チャットに足される概算 input tokens</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button
            type="button"
            style={buttonSecondaryWide}
            onClick={onClearSearchHistory}
          >
            検索履歴を消去
          </button>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>承認待ち抽出候補</div>
        {pendingIntentCandidates.length === 0 ? (
          <div style={helpTextStyle}>
            まだ候補はありません。ルール抽出で不足が出て LLM fallback が補った時だけ、ここに候補が出ます。
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pendingIntentCandidates.map((candidate) => (
              <div
                key={candidate.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: "#fbfdff",
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                  {candidate.kind} / {candidate.phrase}
                </div>
                {candidate.kind === "char_limit" ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    <div style={labelStyle}>rule</div>
                    <select
                      value={candidate.rule ?? "around"}
                      onChange={(e) =>
                        onUpdateIntentCandidate(candidate.id, {
                          rule: e.target.value as PendingIntentCandidate["rule"],
                        })
                      }
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
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
                      onChange={(e) =>
                        onUpdateIntentCandidate(candidate.id, {
                          rule: e.target.value as PendingIntentCandidate["rule"],
                        })
                      }
                      style={{ ...selectStyle, minWidth: 120 }}
                    >
                      <option value="exact">exact</option>
                      <option value="at_least">at_least</option>
                      <option value="up_to">up_to</option>
                      <option value="around">around</option>
                    </select>
                  </div>
                )}
                <div style={{ ...helpTextStyle, marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {candidate.sourceText}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button
                    type="button"
                    style={buttonPrimary}
                    onClick={() => onApproveIntentCandidate(candidate.id)}
                  >
                    承認
                  </button>
                  <button
                    type="button"
                    style={buttonSecondaryWide}
                    onClick={() => onRejectIntentCandidate(candidate.id)}
                  >
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div>
            <div style={labelStyle}>MAX_FACTS</div>
            <input
              inputMode="numeric"
              value={localSettings.maxFacts}
              onChange={(e) => onFieldChange("maxFacts", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>facts の最大数</div>
          </div>
          <div>
            <div style={labelStyle}>MAX_PREFERENCES</div>
            <input
              inputMode="numeric"
              value={localSettings.maxPreferences}
              onChange={(e) => onFieldChange("maxPreferences", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>preferences の最大数</div>
          </div>
          <div>
            <div style={labelStyle}>CHAT_RECENT_LIMIT</div>
            <input
              inputMode="numeric"
              value={localSettings.chatRecentLimit}
              onChange={(e) => onFieldChange("chatRecentLimit", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>recentMessages の保持数</div>
          </div>
          <div>
            <div style={labelStyle}>SUMMARIZE_THRESHOLD</div>
            <input
              inputMode="numeric"
              value={localSettings.summarizeThreshold}
              onChange={(e) => onFieldChange("summarizeThreshold", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>要約へ切り替える閾値</div>
          </div>
          <div>
            <div style={labelStyle}>RECENT_KEEP</div>
            <input
              inputMode="numeric"
              value={localSettings.recentKeep}
              onChange={(e) => onFieldChange("recentKeep", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>要約後に残す recentMessages 数</div>
          </div>
          <div>
            <div style={labelStyle}>メモリ容量</div>
            <div
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                fontWeight: 800,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
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
    </div>
  );
}
