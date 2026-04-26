"use client";

import React from "react";
import type { LibraryItemModeOverride } from "@/components/panels/gpt/gptPanelTypes";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { iconButton } from "@/components/panels/gpt/LibraryDrawerControls";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";
import type { MultipartAssembly, ReferenceLibraryItem } from "@/types/chat";

export default function LibraryItemCardActions({
  item,
  multipartSource,
  isMobile,
  isExpanded,
  selectedTaskLibraryItemId,
  onSelectTaskLibraryItem,
  onChangeLibraryItemMode,
  onDownloadMultipartAssembly,
  onDownloadStoredDocument,
  onShowLibraryItemInChat,
  onSendLibraryItemToKin,
  onUploadLibraryItemToGoogleDrive,
  setExpandedId,
  setEditingId,
  setDraftTitle,
  setDraftSummary,
  setDraftText,
}: {
  item: ReferenceLibraryItem;
  multipartSource: MultipartAssembly | null;
  isMobile: boolean;
  isExpanded: boolean;
  selectedTaskLibraryItemId: string;
  onSelectTaskLibraryItem: LibraryDrawerProps["onSelectTaskLibraryItem"];
  onChangeLibraryItemMode: LibraryDrawerProps["onChangeLibraryItemMode"];
  onDownloadMultipartAssembly: LibraryDrawerProps["onDownloadMultipartAssembly"];
  onDownloadStoredDocument: LibraryDrawerProps["onDownloadStoredDocument"];
  onShowLibraryItemInChat: LibraryDrawerProps["onShowLibraryItemInChat"];
  onSendLibraryItemToKin: LibraryDrawerProps["onSendLibraryItemToKin"];
  onUploadLibraryItemToGoogleDrive: LibraryDrawerProps["onUploadLibraryItemToGoogleDrive"];
  setExpandedId: React.Dispatch<React.SetStateAction<string>>;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  setDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  setDraftSummary: React.Dispatch<React.SetStateAction<string>>;
  setDraftText: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 10,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onSelectTaskLibraryItem(item.id)}
          style={{
            ...pillButton,
            background: item.id === selectedTaskLibraryItemId ? "#f3e8ff" : "#ffffff",
            color: "#7c3aed",
            border: "1px solid #d8b4fe",
          }}
        >
          {GPT_LIBRARY_DRAWER_TEXT.useForTask}
        </button>

        {item.itemType !== "search" ? (
          <button
            type="button"
            onClick={() =>
              item.itemType === "kin_created" && multipartSource
                ? onDownloadMultipartAssembly(multipartSource.id)
                : onDownloadStoredDocument(item.sourceId)
            }
            style={{
              ...pillButton,
              background: "#ffffff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
            }}
          >
            {GPT_LIBRARY_DRAWER_TEXT.download}
          </button>
        ) : null}

        <select
          value={item.modeOverride || "default"}
          onChange={(event) =>
            onChangeLibraryItemMode(
              item.id,
              event.target.value as LibraryItemModeOverride
            )
          }
          style={{
            height: 32,
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#334155",
            fontSize: 12,
            fontWeight: 700,
            padding: "0 10px",
          }}
        >
          <option value="default">{GPT_LIBRARY_DRAWER_TEXT.modeOptions.default}</option>
          <option value="summary_only">{GPT_LIBRARY_DRAWER_TEXT.modeOptions.summary_only}</option>
          <option value="summary_with_excerpt">{GPT_LIBRARY_DRAWER_TEXT.modeOptions.summary_with_excerpt}</option>
        </select>

        {item.itemType !== "search" ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(item.id);
              setDraftTitle(item.title);
              setDraftSummary(item.summary || "");
              setDraftText(item.excerptText);
              if (!isExpanded) setExpandedId(item.id);
            }}
            style={{
              ...pillButton,
              background: "#ffffff",
              color: "#0f766e",
              border: "1px solid #99f6e4",
            }}
          >
            {GPT_LIBRARY_DRAWER_TEXT.edit}
          </button>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: isMobile ? "flex-start" : "flex-end",
        }}
      >
        <button
          type="button"
          onClick={() => onShowLibraryItemInChat(item.id)}
          style={iconButton()}
          title={GPT_GOOGLE_DRIVE_TEXT.cardActions.showInChat}
          aria-label={GPT_GOOGLE_DRIVE_TEXT.cardActions.showInChat}
        >
          見
        </button>
        <button
          type="button"
          onClick={() => void onSendLibraryItemToKin(item.id)}
          style={iconButton()}
          title={GPT_GOOGLE_DRIVE_TEXT.cardActions.sendToKin}
          aria-label={GPT_GOOGLE_DRIVE_TEXT.cardActions.sendToKin}
        >
          送
        </button>
        <button
          type="button"
          onClick={() => void onUploadLibraryItemToGoogleDrive(item.id)}
          style={iconButton()}
          title={GPT_GOOGLE_DRIVE_TEXT.cardActions.uploadToDrive}
          aria-label={GPT_GOOGLE_DRIVE_TEXT.cardActions.uploadToDrive}
        >
          保
        </button>
      </div>
    </div>
  );
}
