"use client";

import React from "react";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";
import type { ReferenceLibraryItem } from "@/types/chat";

export default function LibraryItemStoredDocumentEditor({
  item,
  isMobile,
  draftTitle,
  draftSummary,
  draftText,
  setDraftTitle,
  setDraftSummary,
  setDraftText,
  setEditingId,
  onSaveStoredDocument,
}: {
  item: ReferenceLibraryItem;
  isMobile: boolean;
  draftTitle: string;
  draftSummary: string;
  draftText: string;
  setDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  setDraftSummary: React.Dispatch<React.SetStateAction<string>>;
  setDraftText: React.Dispatch<React.SetStateAction<string>>;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  onSaveStoredDocument: LibraryDrawerProps["onSaveStoredDocument"];
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        style={{
          width: "100%",
          border: "1px solid #dbe4e8",
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 13,
          color: "#334155",
          boxSizing: "border-box",
        }}
      />
      <textarea
        value={draftSummary}
        onChange={(event) => setDraftSummary(event.target.value)}
        style={{
          width: "100%",
          minHeight: 72,
          border: "1px solid #dbe4e8",
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.6,
          color: "#334155",
          background: "#fff",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <textarea
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        style={{
          width: "100%",
          minHeight: isMobile ? 180 : 220,
          border: "1px solid #dbe4e8",
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.6,
          color: "#334155",
          background: "#fff",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            onSaveStoredDocument(item.sourceId, {
              title: draftTitle.trim() || item.title,
              summary: draftSummary.trim(),
              text: draftText,
            });
            setEditingId("");
          }}
          style={{
            ...pillButton,
            background: "#ffffff",
            color: "#0f766e",
            border: "1px solid #99f6e4",
          }}
        >
          {GPT_LIBRARY_DRAWER_TEXT.save}
        </button>
        <button
          type="button"
          onClick={() => setEditingId("")}
          style={{
            ...pillButton,
            background: "#ffffff",
            color: "#64748b",
            border: "1px solid #cbd5e1",
          }}
        >
          {GPT_LIBRARY_DRAWER_TEXT.cancel}
        </button>
      </div>
    </div>
  );
}
