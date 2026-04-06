import React from "react";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  ResponseMode,
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
    <div
      style={{
        display: "grid",
        gap: 8,
        minWidth: 0,
      }}
    >
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
  isMobile = false,
}: Props) {
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
          STRICT は箇条書き寄りで、分かること / 分からないことを分けやすい設定です。
          CREATIVE は自然文寄りで、読みやすさ重視です。
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
          文字中心PDFは「文字優先」、図表や写真中心資料は「視覚優先」、
          スライドやイメージ付き資料は「統合」が基準です。
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
              compact は上限文字数を厳守、detailed は中間量で整理、max は可能な限り保持します。
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
              simple は上限文字数を厳守、detailed は中間量で整理、max は必要情報を広めに残します。
            </div>
          </div>
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
                color: "#0f172a",
                background: "#f8fafc",
              }}
            >
              合計 {memoryCapacityPreview}
            </div>
            <div style={helpTextStyle}>chat recent + facts + preferences の合計</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <button type="button" style={buttonSecondaryWide} onClick={onReset}>
            既定値に戻す
          </button>
          <button type="button" style={buttonPrimary} onClick={onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
