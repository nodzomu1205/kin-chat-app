"use client";

import React from "react";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  helpTextStyle,
  labelStyle,
  pillButton,
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
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={labelStyle}>ファイル取込</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => props.onChangeUploadKind("text")}
              style={{
                ...pillButton,
                background: props.uploadKind === "text" ? "#ecfeff" : "#fff",
                color: "#0f766e",
                border: "1px solid #99f6e4",
              }}
            >
              テキスト
            </button>
            <button
              type="button"
              onClick={() => props.onChangeUploadKind("image")}
              style={{
                ...pillButton,
                background:
                  props.uploadKind === "image" ||
                  props.uploadKind === "pdf" ||
                  props.uploadKind === "mixed"
                    ? "#ecfeff"
                    : "#fff",
                color: "#0f766e",
                border: "1px solid #99f6e4",
              }}
            >
              画像 / PDF
            </button>
          </div>
        </div>
        <LabeledSelect
          label={GPT_SETTINGS_DRAWER_TEXT.fileReadPolicy}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: props.isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
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
                onChange={(v) => props.onChangeCompactCharLimit(Number(v || 0))}
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
                onChange={(v) => props.onChangeSimpleImageCharLimit(Number(v || 0))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibraryCardSummarySettingsSection(props: {
  driveImportAutoSummary: boolean;
  onChangeDriveImportAutoSummary: (value: boolean) => void;
}) {
  return (
    <div style={sectionCard}>
      <ToggleButtons
        label={GPT_INGEST_SETTINGS_TEXT.autoSummaryLabel}
        checked={props.driveImportAutoSummary}
        onChange={props.onChangeDriveImportAutoSummary}
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
