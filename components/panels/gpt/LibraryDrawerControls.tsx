"use client";

import React from "react";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import type { LibraryBulkActionMode } from "@/lib/app/reference-library/libraryItemAggregation";

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
  onShowAllLibraryItemsInChat: (mode: LibraryBulkActionMode) => void | Promise<void>;
  onSendAllLibraryItemsToKin: (mode: LibraryBulkActionMode) => void | Promise<void>;
  initialBulkActionsOpen?: boolean;
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
  onShowAllLibraryItemsInChat,
  onSendAllLibraryItemsToKin,
  initialBulkActionsOpen = false,
}: ImportControlsProps) {
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(initialBulkActionsOpen);
  const [displayMode, setDisplayMode] =
    React.useState<LibraryBulkActionMode>("summary");
  const [kinSendMode, setKinSendMode] =
    React.useState<LibraryBulkActionMode>("summary");

  const actionButtonStyle: React.CSSProperties = {
    ...pillButton,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    minWidth: 0,
    width: "auto",
    minHeight: 40,
    height: "auto",
    justifyContent: "center",
    padding: "8px 12px",
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

  const bulkRowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  };

  const bulkButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    justifyContent: "center",
    minHeight: 36,
    width: "auto",
    minWidth: 132,
    color: "#475569",
    whiteSpace: "normal",
    textAlign: "center",
  };

  const bulkSelectStyle: React.CSSProperties = {
    height: 36,
    minWidth: 142,
    width: 190,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
    padding: "0 8px",
  };

  const renderModeOptions = () => (
    <>
      <option value="index">{GPT_LIBRARY_DRAWER_TEXT.actions.modes.index}</option>
      <option value="summary">{GPT_LIBRARY_DRAWER_TEXT.actions.modes.summary}</option>
      <option value="detail">{GPT_LIBRARY_DRAWER_TEXT.actions.modes.detail}</option>
    </>
  );

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
      <button
        type="button"
        onClick={() => setBulkActionsOpen((prev) => !prev)}
        style={{
          ...actionButtonStyle,
          width: "100%",
          justifyContent: "space-between",
          minHeight: 36,
        }}
        aria-expanded={bulkActionsOpen}
        title={GPT_LIBRARY_DRAWER_TEXT.actions.toggle}
      >
        <span>{GPT_LIBRARY_DRAWER_TEXT.actions.toggle}</span>
        <span>
          {bulkActionsOpen
            ? GPT_LIBRARY_DRAWER_TEXT.actions.collapse
            : GPT_LIBRARY_DRAWER_TEXT.actions.expand}
        </span>
      </button>

      {bulkActionsOpen ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#ffffff",
            border: "1px solid #dbe4e8",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onOpenGoogleDriveFolder}
              style={actionButtonStyle}
              title={GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
              aria-label={GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
            >
              <span style={driveLabelStyle}>Google Drive</span>
              <span style={driveClusterStyle}>
                <span>フォルダ</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDriveImportMenuOpen((prev) => !prev)}
              style={actionButtonStyle}
              title={GPT_GOOGLE_DRIVE_TEXT.settings.importEntry}
              aria-label={GPT_GOOGLE_DRIVE_TEXT.settings.importEntry}
              aria-expanded={driveImportMenuOpen}
            >
              <span style={driveLabelStyle}>Google Drive</span>
              <span style={driveClusterStyle}>
                <span>取込</span>
              </span>
            </button>
            <label
              htmlFor={deviceInputId}
              style={{
                ...actionButtonStyle,
                cursor: deviceImportDisabled ? "default" : "pointer",
                opacity: deviceImportDisabled ? 0.6 : 1,
              }}
              title="デバイスから取り込む"
              aria-label="デバイスから取り込む"
            >
              <span style={driveLabelStyle}>デバイス</span>
              <span style={driveClusterStyle}>
                <span>取込</span>
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
                borderRadius: 8,
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

          <div style={bulkRowStyle}>
            <button
              type="button"
              onClick={() => void onShowAllLibraryItemsInChat(displayMode)}
              style={bulkButtonStyle}
            >
              {GPT_LIBRARY_DRAWER_TEXT.actions.showAll}
            </button>
            <select
              aria-label={`${GPT_LIBRARY_DRAWER_TEXT.actions.showAll} ${GPT_LIBRARY_DRAWER_TEXT.actions.modeLabel}`}
              value={displayMode}
              onChange={(event) =>
                setDisplayMode(event.target.value as LibraryBulkActionMode)
              }
              style={bulkSelectStyle}
            >
              {renderModeOptions()}
            </select>
          </div>
          <div style={bulkRowStyle}>
            <button
              type="button"
              onClick={() => void onSendAllLibraryItemsToKin(kinSendMode)}
              style={bulkButtonStyle}
            >
              {GPT_LIBRARY_DRAWER_TEXT.actions.sendAllToKin}
            </button>
            <select
              aria-label={`${GPT_LIBRARY_DRAWER_TEXT.actions.sendAllToKin} ${GPT_LIBRARY_DRAWER_TEXT.actions.modeLabel}`}
              value={kinSendMode}
              onChange={(event) =>
                setKinSendMode(event.target.value as LibraryBulkActionMode)
              }
              style={bulkSelectStyle}
            >
              {renderModeOptions()}
            </select>
          </div>
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
