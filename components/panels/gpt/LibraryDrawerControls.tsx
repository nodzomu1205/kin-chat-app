import React from "react";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import type {
  LibraryBulkActionMode,
  LibraryBulkActionScope,
} from "@/lib/app/reference-library/libraryItemAggregation";
import type { ImageImportSidecarText } from "@/lib/app/image/imageImportFlow";

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
  onImportDeviceFile: (
    file: File,
    sidecarText?: ImageImportSidecarText
  ) => void | Promise<void>;
  onImportDeviceImageFile: (
    file: File,
    sidecarText?: ImageImportSidecarText
  ) => void | Promise<void>;
  deviceImportAccept: string;
  deviceImportDisabled: boolean;
  onShowAllLibraryItemsInChat: (
    mode: LibraryBulkActionMode,
    scope?: LibraryBulkActionScope
  ) => void | Promise<void>;
  onSendAllLibraryItemsToKin: (
    mode: LibraryBulkActionMode,
    scope?: LibraryBulkActionScope
  ) => void | Promise<void>;
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
  onImportDeviceImageFile,
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

  const tileGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 8,
  };

  const tileStyle: React.CSSProperties = {
    display: "grid",
    gap: 8,
    alignContent: "start",
    border: "1px solid #dbe4e8",
    borderRadius: 8,
    padding: 10,
    background: "#ffffff",
    minWidth: 0,
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

  const setLibraryBulkMode = (mode: LibraryBulkActionMode) => {
    setDisplayMode(mode);
    setKinSendMode(mode);
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
          <div style={tileGridStyle}>
            <div style={tileStyle}>
              <div style={driveLabelStyle}>デバイス</div>
              <label
                htmlFor={deviceInputId}
                style={{
                  ...actionButtonStyle,
                  justifySelf: "start",
                  cursor: deviceImportDisabled ? "default" : "pointer",
                  opacity: deviceImportDisabled ? 0.6 : 1,
                }}
                title="デバイスから取り込む"
                aria-label="デバイスから取り込む"
              >
                <span style={driveClusterStyle}>取込</span>
              </label>
              <input
                id={deviceInputId}
                type="file"
                accept={deviceImportAccept}
                multiple
                disabled={deviceImportDisabled}
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  event.currentTarget.value = "";
                  if (files.length === 0 || deviceImportDisabled) return;
                  void importFilesByType({
                    files,
                    onImportDeviceFile,
                    onImportDeviceImageFile,
                  });
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
            <div style={tileStyle}>
              <div style={driveLabelStyle}>Google Drive</div>
              <div style={bulkRowStyle}>
                <button
                  type="button"
                  onClick={onOpenGoogleDriveFolder}
                  style={actionButtonStyle}
                  title={GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
                  aria-label={GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
                >
                  <span style={driveClusterStyle}>参照</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDriveImportMenuOpen((prev) => !prev)}
                  style={actionButtonStyle}
                  title={GPT_GOOGLE_DRIVE_TEXT.settings.importEntry}
                  aria-label={GPT_GOOGLE_DRIVE_TEXT.settings.importEntry}
                  aria-expanded={driveImportMenuOpen}
                >
                  <span style={driveClusterStyle}>取込</span>
                </button>
              </div>
            </div>
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

          <div style={tileGridStyle}>
            <div style={tileStyle}>
              {sectionTitle("ライブラリ一括")}
              <div style={bulkRowStyle}>
                <button
                  type="button"
                  onClick={() =>
                    void onShowAllLibraryItemsInChat(displayMode, "library")
                  }
                  style={bulkButtonStyle}
                >
                  画面に表示
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void onSendAllLibraryItemsToKin(kinSendMode, "library")
                  }
                  style={bulkButtonStyle}
                >
                  Kinに送信
                </button>
              </div>
              <select
                aria-label={GPT_LIBRARY_DRAWER_TEXT.actions.modeLabel}
                value={displayMode}
                onChange={(event) =>
                  setLibraryBulkMode(event.target.value as LibraryBulkActionMode)
                }
                style={bulkSelectStyle}
              >
                {renderModeOptions()}
              </select>
            </div>
            <div style={tileStyle}>
              {sectionTitle("画像ライブラリ一括")}
              <div style={bulkRowStyle}>
                <button
                  type="button"
                  onClick={() =>
                    void onShowAllLibraryItemsInChat("detail", "images")
                  }
                  style={bulkButtonStyle}
                >
                  画面に表示
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void onSendAllLibraryItemsToKin("detail", "images")
                  }
                  style={bulkButtonStyle}
                >
                  Kinに送信
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function importFilesByType(args: {
  files: File[];
  onImportDeviceFile: (
    file: File,
    sidecarText?: ImageImportSidecarText
  ) => void | Promise<void>;
  onImportDeviceImageFile: (
    file: File,
    sidecarText?: ImageImportSidecarText
  ) => void | Promise<void>;
}) {
  const sidecars = args.files.filter(isTextSidecarFile);
  const images = args.files.filter(isImageFile);
  const pairedSidecars = new Set<File>();
  for (const image of images) {
    const sidecar = findMatchingSidecarFile(image, sidecars);
    if (sidecar) pairedSidecars.add(sidecar);
    await args.onImportDeviceImageFile(
      image,
      sidecar
        ? {
            fileName: sidecar.name,
            text: await sidecar.text(),
          }
        : undefined
    );
  }
  for (const file of args.files) {
    if (isImageFile(file) || pairedSidecars.has(file)) continue;
    await args.onImportDeviceFile(file);
  }
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
}

function isTextSidecarFile(file: File) {
  if (file.type.startsWith("text/")) return true;
  return /\.(txt|md|json)$/i.test(file.name);
}

function findMatchingSidecarFile(image: File, sidecars: File[]) {
  const imageKey = sidecarKey(image.name);
  return sidecars.find((sidecar) => sidecarKey(sidecar.name) === imageKey);
}

function sidecarKey(name: string) {
  return name
    .toLowerCase()
    .replace(/\.(?:png|jpe?g|webp|gif|bmp|svg)$/u, "")
    .replace(/\.generated-image$/u, "")
    .replace(/\.(?:txt|md|json)$/u, "")
    .replace(/\s*\[[\d,]+\s*chars?\]$/u, "")
    .trim();
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
