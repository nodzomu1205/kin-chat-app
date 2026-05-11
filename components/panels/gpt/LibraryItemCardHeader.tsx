"use client";

import React from "react";
import Image from "next/image";
import { formatUpdatedAt } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { iconButton } from "@/components/panels/gpt/LibraryDrawerControls";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import {
  buildLibraryItemEditDraftCommand,
  resolveLibraryItemImageId,
} from "@/lib/app/reference-library/libraryDraftCommands";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";
import type { LibraryRagIndexState } from "@/components/panels/gpt/gptPanelTypes";
import type { MultipartAssembly, ReferenceLibraryItem } from "@/types/chat";

function typeLabel(itemType: ReferenceLibraryItem["itemType"]) {
  return GPT_LIBRARY_DRAWER_TEXT.typeLabels[itemType];
}

export default function LibraryItemCardHeader({
  item,
  priorityIndex,
  libraryReferenceCount,
  imageLibraryReferenceCount,
  ragIndexState,
  selectedTaskLibraryItemId,
  multipartSource,
  isMobile,
  setExpandedId,
  onMoveLibraryItem,
  onDeleteSearchHistoryItem,
  onDeleteMultipartAssembly,
  onDeleteStoredDocument,
  onDraftLibraryItemEditCommand,
  onInsertImageIdToDraft,
}: {
  item: ReferenceLibraryItem;
  priorityIndex: number;
  libraryReferenceCount: number;
  imageLibraryReferenceCount: number;
  ragIndexState: LibraryRagIndexState;
  selectedTaskLibraryItemId: string;
  multipartSource: MultipartAssembly | null;
  isMobile: boolean;
  setExpandedId: React.Dispatch<React.SetStateAction<string>>;
  onMoveLibraryItem: LibraryDrawerProps["onMoveLibraryItem"];
  onDeleteSearchHistoryItem: LibraryDrawerProps["onDeleteSearchHistoryItem"];
  onDeleteMultipartAssembly: LibraryDrawerProps["onDeleteMultipartAssembly"];
  onDeleteStoredDocument: LibraryDrawerProps["onDeleteStoredDocument"];
  onDraftLibraryItemEditCommand: (itemId: string) => void;
  onInsertImageIdToDraft: (imageId: string) => void;
}) {
  const imagePayload = isGeneratedImageLibraryPayload(item.structuredPayload)
    ? item.structuredPayload
    : null;
  const imagePayloadBase64 = imagePayload?.base64 || "";
  const imagePayloadId = imagePayload?.imageId || "";
  const [imageBase64, setImageBase64] = React.useState(imagePayloadBase64);
  React.useEffect(() => {
    let cancelled = false;
    setImageBase64(imagePayloadBase64);
    if (imagePayloadId && !imagePayloadBase64) {
      void loadGeneratedImageAsset(imagePayloadId).then((asset) => {
        if (!cancelled) setImageBase64(asset?.base64 || "");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [imagePayloadBase64, imagePayloadId]);
  const editDraftCommand = buildLibraryItemEditDraftCommand(item);
  const insertableImageId =
    item.artifactType === "generated_image" ? resolveLibraryItemImageId(item) : "";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setExpandedId((prev) => (prev === item.id ? "" : item.id))}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpandedId((prev) => (prev === item.id ? "" : item.id));
        }
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: isMobile ? "wrap" : "nowrap",
        cursor: "pointer",
        minWidth: 0,
      }}
    >
      {imagePayload && imageBase64 ? (
        <Image
          src={`data:${imagePayload.mimeType};base64,${imageBase64}`}
          alt={imagePayload.alt || item.title}
          width={48}
          height={48}
          unoptimized
          style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            objectFit: "cover",
            border: "1px solid #cbd5e1",
            flexShrink: 0,
          }}
        />
      ) : null}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            color: "#0f766e",
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.subtitle}
        </div>
        <div style={{ marginTop: 4, color: "#334155", fontWeight: 700 }}>
          {item.title}
        </div>
        <div suppressHydrationWarning style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
          {typeLabel(item.itemType)} / {formatUpdatedAt(item.updatedAt)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "flex-end",
          gap: 6,
          flexShrink: 0,
          flexWrap: "wrap",
          width: isMobile ? "100%" : undefined,
          minWidth: 0,
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {priorityIndex > 0 &&
        priorityIndex <=
          (item.artifactType === "generated_image"
            ? imageLibraryReferenceCount
            : libraryReferenceCount) ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#7c3aed",
              background: "#f3e8ff",
              border: "1px solid #d8b4fe",
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            {GPT_LIBRARY_DRAWER_TEXT.refPrefix}
            {priorityIndex}
          </span>
        ) : null}
        {item.id === selectedTaskLibraryItemId ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#0f766e",
              background: "#ecfeff",
              border: "1px solid #99f6e4",
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            {GPT_LIBRARY_DRAWER_TEXT.taskSelected}
          </span>
        ) : null}
        {item.artifactType !== "generated_image" ? (
          <RagIndexBadge state={ragIndexState} />
        ) : null}
        {editDraftCommand ? (
          <button
            type="button"
            onClick={() => onDraftLibraryItemEditCommand(item.id)}
            style={iconButton()}
            title="入力欄に編集コマンドをセット"
            aria-label="入力欄に編集コマンドをセット"
          >
            <CopyGlyph />
          </button>
        ) : null}
        {insertableImageId ? (
          <button
            type="button"
            onClick={() => onInsertImageIdToDraft(insertableImageId)}
            style={iconButton()}
            title="Image IDを入力欄に挿入"
            aria-label="Image IDを入力欄に挿入"
          >
            <CopyGlyph />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onMoveLibraryItem(item.id, "up")}
          style={iconButton()}
          title={GPT_LIBRARY_DRAWER_TEXT.moveUpTitle}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMoveLibraryItem(item.id, "down")}
          style={iconButton()}
          title={GPT_LIBRARY_DRAWER_TEXT.moveDownTitle}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => {
            if (item.itemType === "search" && item.rawResultId) {
              onDeleteSearchHistoryItem(item.rawResultId);
              return;
            }
            if (item.itemType === "kin_created" && multipartSource) {
              onDeleteMultipartAssembly(multipartSource.id);
              return;
            }
            onDeleteStoredDocument(item.sourceId);
          }}
          style={iconButton("danger")}
          title={GPT_LIBRARY_DRAWER_TEXT.deleteTitle}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function RagIndexBadge({ state }: { state: LibraryRagIndexState }) {
  const tone =
    state.status === "indexed"
      ? {
          color: "#047857",
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          label: state.chunkCount ? `DB登録 ${state.chunkCount}` : "DB登録済み",
        }
      : state.status === "indexing"
        ? {
            color: "#0369a1",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            label: "DB送付中",
          }
        : state.status === "stale"
          ? {
              color: "#92400e",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              label: "DB再送付候補",
            }
          : state.status === "error"
            ? {
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                label: "DB送付エラー",
              }
            : state.status === "skipped"
              ? {
                  color: "#475569",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  label: "DB未送付",
                }
              : {
                  color: "#64748b",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  label: "DB未登録",
                };
  return (
    <span
      title={state.error || state.skippedReason || tone.label}
      style={{
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 999,
        padding: "2px 8px",
        ...tone,
      }}
    >
      {tone.label}
    </span>
  );
}

function CopyGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="3"
        width="8"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 11.5V5.2C3 4.54 3.54 4 4.2 4H9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
