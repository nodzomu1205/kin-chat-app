import React from "react";
import type { LocalMemorySettingsInput } from "./gptPanelTypes";
import {
  buttonPrimary,
  buttonReset,
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";

type Props = {
  localSettings: LocalMemorySettingsInput;
  onFieldChange: (key: keyof LocalMemorySettingsInput, value: string) => void;
  onReset: () => void;
  onSave: () => void;
  memoryCapacityPreview: number;
  isMobile?: boolean;
};

export default function GptSettingsDrawer({
  localSettings,
  onFieldChange,
  onReset,
  onSave,
  memoryCapacityPreview,
  isMobile = false,
}: Props) {
  return (
    <div
      style={{
        border: "1px solid #dbe4e8",
        borderRadius: 12,
        background: "rgba(255,255,255,0.92)",
        padding: 12,
      }}
    >
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
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <button type="button" style={buttonReset} onClick={onReset}>
          初期化
        </button>
        <button type="button" style={buttonPrimary} onClick={onSave}>
          保存
        </button>
      </div>
    </div>
  );
}
