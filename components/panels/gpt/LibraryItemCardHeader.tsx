"use client";

import React from "react";
import { formatUpdatedAt } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { iconButton } from "@/components/panels/gpt/LibraryDrawerControls";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";
import type { MultipartAssembly, ReferenceLibraryItem } from "@/types/chat";

function typeLabel(itemType: ReferenceLibraryItem["itemType"]) {
  return GPT_LIBRARY_DRAWER_TEXT.typeLabels[itemType];
}

export default function LibraryItemCardHeader({
  item,
  priorityIndex,
  libraryReferenceCount,
  imageLibraryReferenceCount,
  selectedTaskLibraryItemId,
  multipartSource,
  isMobile,
  setExpandedId,
  onMoveLibraryItem,
  onDeleteSearchHistoryItem,
  onDeleteMultipartAssembly,
  onDeleteStoredDocument,
}: {
  item: ReferenceLibraryItem;
  priorityIndex: number;
  libraryReferenceCount: number;
  imageLibraryReferenceCount: number;
  selectedTaskLibraryItemId: string;
  multipartSource: MultipartAssembly | null;
  isMobile: boolean;
  setExpandedId: React.Dispatch<React.SetStateAction<string>>;
  onMoveLibraryItem: LibraryDrawerProps["onMoveLibraryItem"];
  onDeleteSearchHistoryItem: LibraryDrawerProps["onDeleteSearchHistoryItem"];
  onDeleteMultipartAssembly: LibraryDrawerProps["onDeleteMultipartAssembly"];
  onDeleteStoredDocument: LibraryDrawerProps["onDeleteStoredDocument"];
}) {
  const imagePayload = isGeneratedImageLibraryPayload(item.structuredPayload)
    ? item.structuredPayload
    : null;
  const [imageBase64, setImageBase64] = React.useState(imagePayload?.base64 || "");
  React.useEffect(() => {
    let cancelled = false;
    setImageBase64(imagePayload?.base64 || "");
    if (imagePayload && !imagePayload.base64) {
      void loadGeneratedImageAsset(imagePayload.imageId).then((asset) => {
        if (!cancelled) setImageBase64(asset?.base64 || "");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [imagePayload?.base64, imagePayload?.imageId]);
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
        <img
          src={`data:${imagePayload.mimeType};base64,${imageBase64}`}
          alt={imagePayload.alt || item.title}
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
