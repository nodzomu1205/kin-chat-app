"use client";

import React from "react";
import { formatUpdatedAt } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import type { MultipartAssembly, ReferenceLibraryItem } from "@/types/chat";

function typeLabel(itemType: ReferenceLibraryItem["itemType"]) {
  return GPT_LIBRARY_DRAWER_TEXT.typeLabels[itemType];
}

export default function LibraryItemMetadata({
  item,
  multipartSource,
}: {
  item: ReferenceLibraryItem;
  multipartSource: MultipartAssembly | null;
}) {
  return (
    <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
      {item.filename ? (
        <div>
          <strong>繝輔ぃ繧､繝ｫ蜷・</strong> {item.filename}
        </div>
      ) : null}
      <div>
        <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.type}:</strong> {typeLabel(item.itemType)}
      </div>
      <div>
        <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.summary}:</strong>{" "}
        {item.summary || GPT_LIBRARY_DRAWER_TEXT.fields.none}
      </div>
      {item.taskTitle ? (
        <div>
          <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.taskName}:</strong> {item.taskTitle}
        </div>
      ) : null}
      {item.taskId ? (
        <div>
          <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.taskId}:</strong> #{item.taskId}
        </div>
      ) : null}
      {item.kinName ? (
        <div>
          <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.kin}:</strong> {item.kinName}
        </div>
      ) : null}
      {item.completedAt ? (
        <div suppressHydrationWarning>
          <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.completedAt}:</strong>{" "}
          {formatUpdatedAt(item.completedAt)}
        </div>
      ) : null}
      {multipartSource ? (
        <div>
          <strong>{GPT_LIBRARY_DRAWER_TEXT.fields.multipart}:</strong>{" "}
          {multipartSource.parts.length}/{multipartSource.totalParts}
        </div>
      ) : null}
    </div>
  );
}
