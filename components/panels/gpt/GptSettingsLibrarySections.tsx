"use client";

import React from "react";
import type {
  FileReadPolicy,
  ImageDetail,
  ImageLibraryImportMode,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  helpTextStyle,
  labelStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import { sectionCard, subtleCard } from "@/components/panels/gpt/GptSettingsSections";
import {
  GPT_SETTINGS_DRAWER_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_INGEST_SETTINGS_TEXT } from "@/components/panels/gpt/gptIngestSettingsText";
import {
  LabeledSelect,
  NumberField,
  ReadonlyStatField,
  TextField,
  ToggleButtons,
} from "@/components/panels/gpt/GptSettingsShared";

export function IngestSettingsSection(props: {
  isMobile?: boolean;
  uploadKind: UploadKind;
  onChangeUploadKind: (v: UploadKind) => void;
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
}) {
  const unifiedDetail =
    props.imageDetail === "simple" ? "compact" : props.imageDetail;
  const unifiedLimit = props.compactCharLimit;
  const applyUnifiedMode = (value: IngestMode) => {
    props.onChangeIngestMode(value);
    props.onChangeImageDetail(value === "compact" ? "simple" : value);
  };
  const applyUnifiedLimit = (value: number) => {
    props.onChangeCompactCharLimit(value);
    props.onChangeSimpleImageCharLimit(value);
  };

  return (
    <>
      <div style={sectionCard}>
        <div style={{ display: "grid", gap: 12 }}>
        <LabeledSelect
          label="テキスト取込方針"
          value={props.fileReadPolicy}
          onChange={(value) => props.onChangeFileReadPolicy(value as FileReadPolicy)}
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
          <div style={subtleCard}>
            <LabeledSelect
              label="取込粒度"
              value={unifiedDetail}
              onChange={(value) => applyUnifiedMode(value as IngestMode)}
            >
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                value={String(unifiedLimit)}
                onChange={(v) => applyUnifiedLimit(Number(v || 0))}
              />
            </div>
          </div>
        </div>
      </div>
      <div style={sectionCard}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={labelStyle}>画像取込</div>
          <ToggleButtons
            label="画像ライブラリ保存"
            checked={props.imageLibraryImportEnabled}
            onChange={props.onChangeImageLibraryImportEnabled}
          />
          <LabeledSelect
            label="保存内容"
            value={props.imageLibraryImportMode}
            onChange={(value) =>
              props.onChangeImageLibraryImportMode(
                value as ImageLibraryImportMode
              )
            }
          >
            <option value="image_only">画像のみ</option>
            <option value="image_with_description">画像+描写テキスト</option>
          </LabeledSelect>
          <div style={helpTextStyle}>
            オフの場合は通常ライブラリにテキストとして保存します。オンの場合は通常ライブラリへの保存に加え、画像ライブラリにも保存します。
          </div>
        </div>
      </div>
    </>
  );
}

export function LibraryCardSummarySettingsSection(props: {
  autoGenerateLibrarySummary: boolean;
  onChangeAutoGenerateLibrarySummary: (value: boolean) => void;
}) {
  return (
    <div style={sectionCard}>
      <ToggleButtons
        label={GPT_INGEST_SETTINGS_TEXT.autoSummaryLabel}
        checked={props.autoGenerateLibrarySummary}
        onChange={props.onChangeAutoGenerateLibrarySummary}
      />
    </div>
  );
}

export function WorkspaceSectionTitle(props: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: "-0.02em",
        }}
      >
        {props.title}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
        {props.subtitle}
      </div>
    </div>
  );
}

export function GoogleDriveLibrarySection(props: {
  folderLink: string;
  folderId: string;
  integrationMode: "manual_link" | "picker";
  onChangeFolderLink: (value: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>
            {GPT_GOOGLE_DRIVE_TEXT.settings.title}
          </div>
          <div style={helpTextStyle}>
            {GPT_GOOGLE_DRIVE_TEXT.settings.importHelp}
          </div>
        </div>

        <TextField
          label={GPT_GOOGLE_DRIVE_TEXT.settings.folderLinkLabel}
          value={props.folderLink}
          onChange={props.onChangeFolderLink}
          help={GPT_GOOGLE_DRIVE_TEXT.settings.folderLinkHelp}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <ReadonlyStatField
            label={GPT_GOOGLE_DRIVE_TEXT.settings.folderIdLabel}
            value={props.folderId || "-"}
          />
          <ReadonlyStatField
            label={GPT_GOOGLE_DRIVE_TEXT.settings.integrationModeLabel}
            value={
              props.integrationMode === "manual_link"
                ? GPT_GOOGLE_DRIVE_TEXT.settings.integrationModeManual
                : GPT_GOOGLE_DRIVE_TEXT.settings.integrationModePicker
            }
          />
        </div>
      </div>
    </div>
  );
}
