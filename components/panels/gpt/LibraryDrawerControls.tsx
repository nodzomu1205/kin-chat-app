"use client";

import React from "react";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import type { LibraryTab } from "@/components/panels/gpt/LibraryDrawerTypes";

export function tabButton(active: boolean): React.CSSProperties {
  return {
    ...pillButton,
    background: active ? "#ecfeff" : "#fff",
    color: "#0f766e",
    border: "1px solid #99f6e4",
  };
}

export function iconButton(tone: "default" | "danger" = "default"): React.CSSProperties {
  return {
    ...pillButton,
    minWidth: 26,
    width: 26,
    height: 26,
    padding: 0,
    background: "#fff",
    color: tone === "danger" ? "#dc2626" : "#0f766e",
    border: tone === "danger" ? "1px solid #fecaca" : "1px solid #99f6e4",
    fontSize: 13,
    lineHeight: 1,
  };
}

export function sectionTitle(text: string) {
  return <div style={{ fontWeight: 700, color: "#0f172a" }}>{text}</div>;
}

type ImportControlsProps = {
  driveImportMenuOpen: boolean;
  setDriveImportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenGoogleDriveFolder: () => void;
  onImportGoogleDriveFile: () => void | Promise<void>;
  onIndexGoogleDriveFolder: () => void | Promise<void>;
  onImportGoogleDriveFolder: () => void | Promise<void>;
  deviceInputId: string;
  onImportDeviceFile: (file: File) => void | Promise<void>;
  deviceImportAccept: string;
  deviceImportDisabled: boolean;
};

export function LibraryImportControls({
  driveImportMenuOpen,
  setDriveImportMenuOpen,
  onOpenGoogleDriveFolder,
  onImportGoogleDriveFile,
  onIndexGoogleDriveFolder,
  onImportGoogleDriveFolder,
  deviceInputId,
  onImportDeviceFile,
  deviceImportAccept,
  deviceImportDisabled,
}: ImportControlsProps) {
  const driveActionButtonStyle: React.CSSProperties = {
    ...pillButton,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    minWidth: 0,
    width: "auto",
    height: 40,
    justifyContent: "center",
    padding: "0 12px",
  };

  const driveClusterStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
  };

  const driveLabelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#2563eb",
    lineHeight: 1,
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: "#f8fafc",
        border: "1px solid #dbe4e8",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onOpenGoogleDriveFolder}
          style={driveActionButtonStyle}
          title={GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
          aria-label={GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
        >
          <span style={driveLabelStyle}>Google Drive</span>
          <span style={driveClusterStyle}>
            <span>📁</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDriveImportMenuOpen((prev) => !prev)}
          style={driveActionButtonStyle}
          title={GPT_GOOGLE_DRIVE_TEXT.settings.importEntry}
          aria-label={GPT_GOOGLE_DRIVE_TEXT.settings.importEntry}
          aria-expanded={driveImportMenuOpen}
        >
          <span style={driveLabelStyle}>Google Drive</span>
          <span style={driveClusterStyle}>
            <span>⤵</span>
          </span>
        </button>
        <label
          htmlFor={deviceInputId}
          style={{
            ...driveActionButtonStyle,
            cursor: deviceImportDisabled ? "default" : "pointer",
            opacity: deviceImportDisabled ? 0.6 : 1,
          }}
          title="デバイスから取り込む"
          aria-label="デバイスから取り込む"
        >
          <span style={driveLabelStyle}>デバイス</span>
          <span style={driveClusterStyle}>
            <span>⤵</span>
          </span>
        </label>
        <input
          id={deviceInputId}
          type="file"
          accept={deviceImportAccept}
          disabled={deviceImportDisabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (!file || deviceImportDisabled) return;
            void onImportDeviceFile(file);
          }}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        />
      </div>

      {driveImportMenuOpen ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #dbe4e8",
          }}
        >
          <DriveMenuButton
            onClick={() => {
              setDriveImportMenuOpen(false);
              void onImportGoogleDriveFile();
            }}
          >
            {GPT_GOOGLE_DRIVE_TEXT.settings.importFile}
          </DriveMenuButton>
          <DriveMenuButton
            onClick={() => {
              setDriveImportMenuOpen(false);
              void onImportGoogleDriveFolder();
            }}
          >
            {GPT_GOOGLE_DRIVE_TEXT.settings.importFolder}
          </DriveMenuButton>
          <DriveMenuButton
            onClick={() => {
              setDriveImportMenuOpen(false);
              void onIndexGoogleDriveFolder();
            }}
          >
            {GPT_GOOGLE_DRIVE_TEXT.settings.indexFolder}
          </DriveMenuButton>
        </div>
      ) : null}
    </div>
  );
}

function DriveMenuButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...pillButton,
        justifyContent: "flex-start",
        background: "#ffffff",
        color: "#0f172a",
        border: "1px solid #cbd5e1",
      }}
    >
      {children}
    </button>
  );
}

export function LibraryTabBar({
  activeTab,
  setActiveTab,
}: {
  activeTab: LibraryTab;
  setActiveTab: React.Dispatch<React.SetStateAction<LibraryTab>>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        padding: "10px 12px",
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #dbe4e8",
      }}
    >
      <button type="button" onClick={() => setActiveTab("all")} style={tabButton(activeTab === "all")}>
        {GPT_LIBRARY_DRAWER_TEXT.tabs.all}
      </button>
      <button type="button" onClick={() => setActiveTab("kin")} style={tabButton(activeTab === "kin")}>
        {GPT_LIBRARY_DRAWER_TEXT.tabs.kin}
      </button>
      <button type="button" onClick={() => setActiveTab("ingest")} style={tabButton(activeTab === "ingest")}>
        {GPT_LIBRARY_DRAWER_TEXT.tabs.ingest}
      </button>
      <button type="button" onClick={() => setActiveTab("search")} style={tabButton(activeTab === "search")}>
        {GPT_LIBRARY_DRAWER_TEXT.tabs.search}
      </button>
    </div>
  );
}
