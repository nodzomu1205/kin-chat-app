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
  deviceImportAccept,
  deviceImportDisabled = false,
}: LibraryDrawerProps) {
  const [driveImportMenuOpen, setDriveImportMenuOpen] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftText, setDraftText] = useState("");
  const deviceInputId = React.useId();

  return (
    <section style={{ ...sectionCardStyle, minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}>
      <LibraryImportControls
        driveImportMenuOpen={driveImportMenuOpen}
        setDriveImportMenuOpen={setDriveImportMenuOpen}
        onOpenGoogleDriveFolder={onOpenGoogleDriveFolder}
        onImportGoogleDriveFile={onImportGoogleDriveFile}
        onIndexGoogleDriveFolder={onIndexGoogleDriveFolder}
        onImportGoogleDriveFolder={onImportGoogleDriveFolder}
        deviceInputId={deviceInputId}
        onImportDeviceFile={onImportDeviceFile}
        deviceImportAccept={deviceImportAccept}
        deviceImportDisabled={deviceImportDisabled}
        onShowAllLibraryItemsInChat={onShowAllLibraryItemsInChat}
        onSendAllLibraryItemsToKin={onSendAllLibraryItemsToKin}
      />

      {referenceLibraryItems.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          {GPT_LIBRARY_DRAWER_TEXT.emptyAll}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {referenceLibraryItems.map((item) => (
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
