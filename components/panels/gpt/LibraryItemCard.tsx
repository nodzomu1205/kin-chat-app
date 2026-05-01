"use client";

import React from "react";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { sectionTitle } from "@/components/panels/gpt/LibraryDrawerControls";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";
import LibraryItemCardActions from "@/components/panels/gpt/LibraryItemCardActions";
import LibraryItemCardHeader from "@/components/panels/gpt/LibraryItemCardHeader";
import LibraryItemMetadata from "@/components/panels/gpt/LibraryItemMetadata";
import LibraryItemSearchPreview, {
  getAskAiModeCandidates,
  type AskAiModeCandidate,
  LibraryItemPreviewTextArea,
} from "@/components/panels/gpt/LibraryItemSearchPreview";
import LibraryItemStoredDocumentEditor from "@/components/panels/gpt/LibraryItemStoredDocumentEditor";
import {
  isGeneratedImageLibraryPayload,
  type GeneratedImageLibraryPayload,
} from "@/lib/app/image/imageLibrary";
import { buildGeneratedImageDisplayText } from "@/lib/app/image/imageDisplayText";
import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import { parsePresentationPayload } from "@/lib/app/presentation/presentationDocumentBuilders";
import type { MultipartAssembly, ReferenceLibraryItem } from "@/types/chat";

type Props = Pick<
  LibraryDrawerProps,
  | "referenceLibraryItems"
  | "multipartAssemblies"
  | "libraryReferenceCount"
  | "sourceDisplayCount"
  | "selectedTaskLibraryItemId"
  | "onSelectTaskLibraryItem"
  | "onMoveLibraryItem"
  | "onChangeLibraryItemMode"
  | "onStartAskAiModeSearch"
  | "onImportYouTubeTranscript"
  | "onSendYouTubeTranscriptToKin"
  | "onDownloadMultipartAssembly"
  | "onDeleteMultipartAssembly"
  | "onDownloadStoredDocument"
  | "onDeleteStoredDocument"
  | "onDeleteSearchHistoryItem"
  | "onSaveStoredDocument"
  | "onShowLibraryItemInChat"
  | "onSendLibraryItemToKin"
  | "onUploadLibraryItemToGoogleDrive"
  | "onRenderPresentationPlanToPpt"
> & {
  item: ReferenceLibraryItem;
  isMobile: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  draftTitle: string;
  draftSummary: string;
  draftText: string;
  setExpandedId: React.Dispatch<React.SetStateAction<string>>;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  setDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  setDraftSummary: React.Dispatch<React.SetStateAction<string>>;
  setDraftText: React.Dispatch<React.SetStateAction<string>>;
};

export default function LibraryItemCard({
  item,
  referenceLibraryItems,
  multipartAssemblies,
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
  onUploadLibraryItemToGoogleDrive,
  onRenderPresentationPlanToPpt,
  isMobile,
  isExpanded,
  isEditing,
  draftTitle,
  draftSummary,
  draftText,
  setExpandedId,
  setEditingId,
  setDraftTitle,
  setDraftSummary,
  setDraftText,
}: Props) {
  const priorityIndex =
    referenceLibraryItems.findIndex((entry) => entry.id === item.id) + 1;
  const multipartSource =
    item.itemType === "kin_created"
      ? multipartAssemblies.find((entry) => `kin:${entry.id}` === item.sourceId) || null
      : null;
  const askAiModeCandidates =
    item.itemType === "search" ? getAskAiModeCandidates(item) : [];
  const presentationPayload =
    item.artifactType === "presentation"
      ? parsePresentationPayload(item.excerptText)
      : null;
  const imagePayload = isGeneratedImageLibraryPayload(item.structuredPayload)
    ? item.structuredPayload
    : null;

  return (
    <div
      style={{
        border: isExpanded ? "1px solid #99f6e4" : "1px solid #e2e8f0",
        borderRadius: 12,
        background: isExpanded ? "#ecfeff" : "#fff",
        padding: "10px 12px",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <LibraryItemCardHeader
        item={item}
        priorityIndex={priorityIndex}
        libraryReferenceCount={libraryReferenceCount}
        selectedTaskLibraryItemId={selectedTaskLibraryItemId}
        multipartSource={multipartSource}
        isMobile={isMobile}
        setExpandedId={setExpandedId}
        onMoveLibraryItem={onMoveLibraryItem}
        onDeleteSearchHistoryItem={onDeleteSearchHistoryItem}
        onDeleteMultipartAssembly={onDeleteMultipartAssembly}
        onDeleteStoredDocument={onDeleteStoredDocument}
      />

      <LibraryItemCardActions
        item={item}
        multipartSource={multipartSource}
        isMobile={isMobile}
        isExpanded={isExpanded}
        selectedTaskLibraryItemId={selectedTaskLibraryItemId}
        onSelectTaskLibraryItem={onSelectTaskLibraryItem}
        onChangeLibraryItemMode={onChangeLibraryItemMode}
        onDownloadMultipartAssembly={onDownloadMultipartAssembly}
        onDownloadStoredDocument={onDownloadStoredDocument}
        onShowLibraryItemInChat={onShowLibraryItemInChat}
        onSendLibraryItemToKin={onSendLibraryItemToKin}
        onUploadLibraryItemToGoogleDrive={onUploadLibraryItemToGoogleDrive}
        onRenderPresentationPlanToPpt={onRenderPresentationPlanToPpt}
        setExpandedId={setExpandedId}
        setEditingId={setEditingId}
        setDraftTitle={setDraftTitle}
        setDraftSummary={setDraftSummary}
        setDraftText={setDraftText}
      />

      {isExpanded ? (
        <LibraryItemCardBody
          item={item}
          multipartSource={multipartSource}
          askAiModeCandidates={askAiModeCandidates}
          presentationPayload={presentationPayload}
          imagePayload={imagePayload}
          sourceDisplayCount={sourceDisplayCount}
          isMobile={isMobile}
          isEditing={isEditing}
          draftTitle={draftTitle}
          draftSummary={draftSummary}
          draftText={draftText}
          setDraftTitle={setDraftTitle}
          setDraftSummary={setDraftSummary}
          setDraftText={setDraftText}
          setEditingId={setEditingId}
          onStartAskAiModeSearch={onStartAskAiModeSearch}
          onImportYouTubeTranscript={onImportYouTubeTranscript}
          onSendYouTubeTranscriptToKin={onSendYouTubeTranscriptToKin}
          onSaveStoredDocument={onSaveStoredDocument}
        />
      ) : null}
    </div>
  );
}

function LibraryItemCardBody({
  item,
  multipartSource,
  askAiModeCandidates,
  presentationPayload,
  imagePayload,
  sourceDisplayCount,
  isMobile,
  isEditing,
  draftTitle,
  draftSummary,
  draftText,
  setDraftTitle,
  setDraftSummary,
  setDraftText,
  setEditingId,
  onStartAskAiModeSearch,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
  onSaveStoredDocument,
}: {
  item: ReferenceLibraryItem;
  multipartSource: MultipartAssembly | null;
  askAiModeCandidates: AskAiModeCandidate[];
  presentationPayload: ReturnType<typeof parsePresentationPayload>;
  imagePayload: GeneratedImageLibraryPayload | null;
  sourceDisplayCount: number;
  isMobile: boolean;
  isEditing: boolean;
  draftTitle: string;
  draftSummary: string;
  draftText: string;
  setDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  setDraftSummary: React.Dispatch<React.SetStateAction<string>>;
  setDraftText: React.Dispatch<React.SetStateAction<string>>;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  onStartAskAiModeSearch: LibraryDrawerProps["onStartAskAiModeSearch"];
  onImportYouTubeTranscript: LibraryDrawerProps["onImportYouTubeTranscript"];
  onSendYouTubeTranscriptToKin: LibraryDrawerProps["onSendYouTubeTranscriptToKin"];
  onSaveStoredDocument: LibraryDrawerProps["onSaveStoredDocument"];
}) {
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid #dbe4e8",
        display: "grid",
        gap: 8,
      }}
    >
      {sectionTitle(GPT_LIBRARY_DRAWER_TEXT.previewTitle)}

      <LibraryItemMetadata item={item} multipartSource={multipartSource} />

      {presentationPayload?.outputs.length ? (
        <PresentationOutputLinks payload={presentationPayload} />
      ) : null}

      {imagePayload ? <GeneratedImagePreview payload={imagePayload} /> : null}

      {item.itemType === "search" ? (
        <LibraryItemSearchPreview
          item={item}
          askAiModeCandidates={askAiModeCandidates}
          sourceDisplayCount={sourceDisplayCount}
          isMobile={isMobile}
          onStartAskAiModeSearch={onStartAskAiModeSearch}
          onImportYouTubeTranscript={onImportYouTubeTranscript}
          onSendYouTubeTranscriptToKin={onSendYouTubeTranscriptToKin}
        />
      ) : isEditing ? (
        <LibraryItemStoredDocumentEditor
          item={item}
          isMobile={isMobile}
          draftTitle={draftTitle}
          draftSummary={draftSummary}
          draftText={draftText}
          setDraftTitle={setDraftTitle}
          setDraftSummary={setDraftSummary}
          setDraftText={setDraftText}
          setEditingId={setEditingId}
          onSaveStoredDocument={onSaveStoredDocument}
        />
      ) : (
        <LibraryItemPreviewTextArea
          value={
            imagePayload
              ? buildGeneratedImageDisplayText({ payload: imagePayload })
              : item.excerptText
          }
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

function GeneratedImagePreview({
  payload,
}: {
  payload: GeneratedImageLibraryPayload;
}) {
  const [imageBase64, setImageBase64] = React.useState(payload.base64 || "");
  React.useEffect(() => {
    let cancelled = false;
    setImageBase64(payload.base64 || "");
    if (!payload.base64) {
      void loadGeneratedImageAsset(payload.imageId).then((asset) => {
        if (!cancelled) setImageBase64(asset?.base64 || "");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [payload.base64, payload.imageId]);
  const imageSrc = imageBase64
    ? `data:${payload.mimeType};base64,${imageBase64}`
    : "";
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={payload.alt || payload.imageId}
          style={{
            width: "100%",
            maxHeight: 280,
            objectFit: "contain",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        />
      ) : null}
      <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>
        Image ID: {payload.imageId}
      </div>
    </div>
  );
}

function PresentationOutputLinks({
  payload,
}: {
  payload: NonNullable<ReturnType<typeof parsePresentationPayload>>;
}) {
  const latest = payload.outputs[payload.outputs.length - 1];
  if (!latest?.path) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8" }}>
          Latest PPTX
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#334155",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={latest.filename}
        >
          {latest.filename}
        </div>
      </div>
      <a
        href={latest.path}
        download={latest.filename}
        style={{
          flexShrink: 0,
          borderRadius: 999,
          border: "1px solid #2563eb",
          background: "#2563eb",
          color: "#fff",
          padding: "6px 10px",
          fontSize: 11,
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        Download PPTX
      </a>
    </div>
  );
}
