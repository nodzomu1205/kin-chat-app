"use client";

import React from "react";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
} from "./gptPanelTypes";
import type { LocalMemorySettingsInput } from "./gptPanelHelpers";
import {
  buttonPrimary,
  buttonSecondaryWide,
} from "./gptPanelStyles";
import {
  LabeledSelect,
  NumberField,
  ReadonlyStatField,
  sectionCard,
  subtleCard,
} from "./GptSettingsShared";
import { GPT_SETTINGS_DRAWER_TEXT } from "./gptSettingsText";

type MemorySectionText = {
  memoryCapacityPreviewLabel: string;
  memoryCapacityPreviewPrefix: string;
  memoryCapacityPreviewHelp: string;
  reset: string;
  save: string;
};

export function MemorySettingsSection(props: {
  isMobile?: boolean;
  localSettings: LocalMemorySettingsInput;
  memoryCapacityPreview: number;
  onFieldChange: (key: keyof LocalMemorySettingsInput, value: string) => void;
  onReset: () => void;
  onSave: () => void;
  text?: MemorySectionText;
  cardStyle?: React.CSSProperties;
  actionTopMargin?: number;
}) {
  const text = props.text ?? GPT_SETTINGS_DRAWER_TEXT;
  return (
    <>
      <div style={props.cardStyle ?? sectionCard}>
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
            onChange={(value) => props.onFieldChange("maxFacts", value)}
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxFacts}
          />
          <NumberField
            label="MAX_PREFERENCES"
            value={props.localSettings.maxPreferences}
            onChange={(value) => props.onFieldChange("maxPreferences", value)}
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.maxPreferences}
          />
          <NumberField
            label="CHAT_RECENT_LIMIT"
            value={props.localSettings.chatRecentLimit}
            onChange={(value) => props.onFieldChange("chatRecentLimit", value)}
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.chatRecentLimit}
          />
          <NumberField
            label="SUMMARIZE_THRESHOLD"
            value={props.localSettings.summarizeThreshold}
            onChange={(value) =>
              props.onFieldChange("summarizeThreshold", value)
            }
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.summarizeThreshold}
          />
          <NumberField
            label="RECENT_KEEP"
            value={props.localSettings.recentKeep}
            onChange={(value) => props.onFieldChange("recentKeep", value)}
            help={GPT_SETTINGS_DRAWER_TEXT.memoryFieldHelp.recentKeep}
          />
          <ReadonlyStatField
            label={text.memoryCapacityPreviewLabel}
            value={`${text.memoryCapacityPreviewPrefix}${props.memoryCapacityPreview}`}
            help={text.memoryCapacityPreviewHelp}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          flexWrap: "wrap",
          marginTop: props.actionTopMargin,
        }}
      >
        <button type="button" style={buttonSecondaryWide} onClick={props.onReset}>
          {text.reset}
        </button>
        <button type="button" style={buttonPrimary} onClick={props.onSave}>
          {text.save}
        </button>
      </div>
    </>
  );
}

export function IngestSettingsSection(props: {
  isMobile?: boolean;
  fileReadPolicy: FileReadPolicy;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeFileReadPolicy: (value: FileReadPolicy) => void;
  onChangeIngestMode: (value: IngestMode) => void;
  onChangeImageDetail: (value: ImageDetail) => void;
  onChangeCompactCharLimit: (value: number) => void;
  onChangeSimpleImageCharLimit: (value: number) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <LabeledSelect
          label={GPT_SETTINGS_DRAWER_TEXT.fileReadPolicy}
          value={props.fileReadPolicy}
          onChange={(value) =>
            props.onChangeFileReadPolicy(value as FileReadPolicy)
          }
        >
          <option value="text_first">
            {GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_first}
          </option>
          <option value="visual_first">
            {GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.visual_first}
          </option>
          <option value="text_and_layout">
            {GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_and_layout}
          </option>
        </LabeledSelect>
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
            <LabeledSelect
              label={GPT_SETTINGS_DRAWER_TEXT.textIngest}
              value={props.ingestMode}
              onChange={(value) => props.onChangeIngestMode(value as IngestMode)}
            >
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                value={String(props.compactCharLimit)}
                onChange={(value) =>
                  props.onChangeCompactCharLimit(Number(value || 0))
                }
              />
            </div>
          </div>
          <div style={subtleCard}>
            <LabeledSelect
              label={GPT_SETTINGS_DRAWER_TEXT.imagePdfIngest}
              value={props.imageDetail}
              onChange={(value) => props.onChangeImageDetail(value as ImageDetail)}
            >
              <option value="simple">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                value={String(props.simpleImageCharLimit)}
                onChange={(value) =>
                  props.onChangeSimpleImageCharLimit(Number(value || 0))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
