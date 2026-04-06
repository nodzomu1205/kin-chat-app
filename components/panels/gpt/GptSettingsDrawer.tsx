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
  fileReadPolicy,
  onChangeFileReadPolicy,
  isMobile = false,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
      }}
    >
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

        <div style={{ ...helpTextStyle, marginTop: 10 }}>
          STRICT は事実優先、CREATIVE は通常会話寄りです。
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
          文字中心PDFは「文字優先」、図表や画像中心資料は「視覚優先」、スライドや解説資料は「統合」が基準です。
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>テキスト・画像圧縮設定</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div>
            <div style={labelStyle}>テキスト読込</div>
            <select
              value={ingestMode}
              onChange={(e) => onChangeIngestMode(e.target.value as IngestMode)}
              style={selectStyle}
            >
              <option value="strict">strict</option>
              <option value="creative">creative</option>
              <option value="max">max</option>
            </select>
            <div style={helpTextStyle}>txt / md / csv / code などの既定粒度</div>
          </div>

          <div>
            <div style={labelStyle}>画像 / PDF読込</div>
            <select
              value={imageDetail}
              onChange={(e) =>
                onChangeImageDetail(e.target.value as ImageDetail)
              }
              style={selectStyle}
            >
              <option value="low">low</option>
              <option value="high">high</option>
              <option value="auto">auto</option>
            </select>
            <div style={helpTextStyle}>視覚記述の既定粒度</div>
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
            <div style={helpTextStyle}>recentMessages の保持件数</div>
          </div>

          <div>
            <div style={labelStyle}>SUMMARIZE_THRESHOLD</div>
            <input
              inputMode="numeric"
              value={localSettings.summarizeThreshold}
              onChange={(e) => onFieldChange("summarizeThreshold", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>要約更新を走らせる閾値</div>
          </div>

          <div>
            <div style={labelStyle}>RECENT_KEEP</div>
            <input
              inputMode="numeric"
              value={localSettings.recentKeep}
              onChange={(e) => onFieldChange("recentKeep", e.target.value)}
              style={inputStyle}
            />
            <div style={helpTextStyle}>要約後に recent に残す件数</div>
          </div>
        </div>

        <div style={{ ...helpTextStyle, marginTop: 12 }}>
          メモリの総枠は、直近チャット + facts + preferences の合計です。現在の設定では {memoryCapacityPreview} 枠です。
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            flexWrap: isMobile ? "wrap" : "nowrap",
          }}
        >
          <button
            type="button"
            style={{
              ...buttonSecondaryWide,
              minWidth: isMobile ? 64 : 72,
              height: isMobile ? 38 : 40,
              padding: isMobile ? "8px 12px" : buttonSecondaryWide.padding,
              fontSize: isMobile ? 13 : 14,
              writingMode: "horizontal-tb",
              textOrientation: "mixed",
            }}
            onClick={onReset}
          >
            初期化
          </button>
          <button
            type="button"
            style={{
              ...buttonPrimary,
              minWidth: isMobile ? 64 : 64,
              height: isMobile ? 38 : 40,
              padding: isMobile ? "8px 12px" : buttonPrimary.padding,
              fontSize: isMobile ? 13 : 14,
              writingMode: "horizontal-tb",
              textOrientation: "mixed",
            }}
            onClick={onSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}