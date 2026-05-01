"use client";

import React, { useState } from "react";
import { sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { LibraryImportControls } from "@/components/panels/gpt/LibraryDrawerControls";
import LibraryItemCard from "@/components/panels/gpt/LibraryItemCard";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";

export default function LibraryDrawer({
  multipartAssemblies,
  referenceLibraryItems,
  libraryReferenceCount,
  sourceDisplayCount,
  selectedTaskLibraryItemId,
  onSelectTaskLibraryItem,
  onMoveLibraryItem,
  onChangeLibraryItemMode,
  onStartAskAiModeSearch,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
  onDownloadMultipartAssembly,
  onDeleteMultipartAssembly,
  onDownloadStoredDocument,
  onDeleteStoredDocument,
  onDeleteSearchHistoryItem,
  onSaveStoredDocument,
  onShowLibraryItemInChat,
  onSendLibraryItemToKin,
  onShowAllLibraryItemsInChat,
  onSendAllLibraryItemsToKin,
  onUploadLibraryItemToGoogleDrive,
  onRenderPresentationPlanToPpt,
  onOpenGoogleDriveFolder,
  onImportGoogleDriveFile,
  onIndexGoogleDriveFolder,
  onImportGoogleDriveFolder,
  isMobile = false,
  onImportDeviceFile,
  onImportDeviceImageFile,
  onImportGoogleDriveImageFile,
  deviceImportAccept,
  imageImportAccept,
  deviceImportDisabled = false,
}: LibraryDrawerProps) {
  const [driveImportMenuOpen, setDriveImportMenuOpen] = useState(false);
  const [activeLibraryView, setActiveLibraryView] = useState<"library" | "images">("library");
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftText, setDraftText] = useState("");
  const deviceInputId = React.useId();
  const visibleItems =
    activeLibraryView === "images"
      ? referenceLibraryItems.filter((item) => item.artifactType === "generated_image")
      : referenceLibraryItems.filter((item) => item.artifactType !== "generated_image");

  return (
    <section style={{ ...sectionCardStyle, minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}>
      <LibraryImportControls
        driveImportMenuOpen={driveImportMenuOpen}
        setDriveImportMenuOpen={setDriveImportMenuOpen}
        onOpenGoogleDriveFolder={onOpenGoogleDriveFolder}
        onImportGoogleDriveFile={onImportGoogleDriveFile}
        onImportGoogleDriveImageFile={onImportGoogleDriveImageFile}
        onIndexGoogleDriveFolder={onIndexGoogleDriveFolder}
        onImportGoogleDriveFolder={onImportGoogleDriveFolder}
        deviceInputId={deviceInputId}
        onImportDeviceFile={
          activeLibraryView === "images" ? onImportDeviceImageFile : onImportDeviceFile
        }
        deviceImportAccept={
          activeLibraryView === "images" ? imageImportAccept : deviceImportAccept
        }
        deviceImportDisabled={deviceImportDisabled}
        importTarget={activeLibraryView}
        onShowAllLibraryItemsInChat={onShowAllLibraryItemsInChat}
        onSendAllLibraryItemsToKin={onSendAllLibraryItemsToKin}
      />

      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 10,
          borderBottom: "1px solid #e2e8f0",
        }}
        aria-label="ライブラリ表示切替"
      >
        {[
          { id: "library" as const, label: "ライブラリ" },
          { id: "images" as const, label: "画像" },
        ].map((tab) => {
          const active = activeLibraryView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLibraryView(tab.id)}
              style={{
                border: 0,
                borderBottom: active ? "2px solid #0f766e" : "2px solid transparent",
                background: "transparent",
                color: active ? "#0f766e" : "#64748b",
                fontSize: 12,
                fontWeight: 800,
                padding: "7px 8px",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          {activeLibraryView === "images"
            ? "保存画像はまだありません。"
            : GPT_LIBRARY_DRAWER_TEXT.emptyAll}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {visibleItems.map((item) => (
            <LibraryItemCard
              key={item.id}
              item={item}
              multipartAssemblies={multipartAssemblies}
              referenceLibraryItems={referenceLibraryItems}
              libraryReferenceCount={libraryReferenceCount}
              sourceDisplayCount={sourceDisplayCount}
              selectedTaskLibraryItemId={selectedTaskLibraryItemId}
              onSelectTaskLibraryItem={onSelectTaskLibraryItem}
              onMoveLibraryItem={onMoveLibraryItem}
              onChangeLibraryItemMode={onChangeLibraryItemMode}
              onStartAskAiModeSearch={onStartAskAiModeSearch}
              onImportYouTubeTranscript={onImportYouTubeTranscript}
              onSendYouTubeTranscriptToKin={onSendYouTubeTranscriptToKin}
              onDownloadMultipartAssembly={onDownloadMultipartAssembly}
              onDeleteMultipartAssembly={onDeleteMultipartAssembly}
              onDownloadStoredDocument={onDownloadStoredDocument}
              onDeleteStoredDocument={onDeleteStoredDocument}
              onDeleteSearchHistoryItem={onDeleteSearchHistoryItem}
              onSaveStoredDocument={onSaveStoredDocument}
              onShowLibraryItemInChat={onShowLibraryItemInChat}
              onSendLibraryItemToKin={onSendLibraryItemToKin}
              onUploadLibraryItemToGoogleDrive={onUploadLibraryItemToGoogleDrive}
              onRenderPresentationPlanToPpt={onRenderPresentationPlanToPpt}
              isMobile={isMobile}
              isExpanded={item.id === expandedId}
              isEditing={item.id === editingId}
              draftTitle={draftTitle}
              draftSummary={draftSummary}
              draftText={draftText}
              setExpandedId={setExpandedId}
              setEditingId={setEditingId}
              setDraftTitle={setDraftTitle}
              setDraftSummary={setDraftSummary}
              setDraftText={setDraftText}
            />
          ))}
        </div>
      )}
    </section>
  );
}
