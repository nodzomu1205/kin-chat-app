"use client";

import React from "react";
import { MESSAGE_SOURCES_TEXT } from "@/components/message/messageText";
import type { SourceItem } from "@/types/chat";

export function YoutubeActions({
  source,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
}: {
  source: SourceItem;
  onImportYouTubeTranscript?: (source: SourceItem) => void | Promise<void>;
  onSendYouTubeTranscriptToKin?: (source: SourceItem) => void | Promise<void>;
}) {
  if (!onImportYouTubeTranscript && !onSendYouTubeTranscriptToKin) {
    return null;
  }

  return (
    <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {onImportYouTubeTranscript ? (
        <button
          type="button"
          onClick={() => {
            void onImportYouTubeTranscript(source);
          }}
          style={{
            height: 30,
            borderRadius: 999,
            border: "1px solid #fca5a5",
            background: "#fff",
            color: "#b91c1c",
            padding: "0 12px",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {MESSAGE_SOURCES_TEXT.transcriptImport}
        </button>
      ) : null}

      {onSendYouTubeTranscriptToKin ? (
        <button
          type="button"
          onClick={() => {
            void onSendYouTubeTranscriptToKin(source);
          }}
          style={{
            height: 30,
            borderRadius: 999,
            border: "1px solid #c4b5fd",
            background: "#fff",
            color: "#7c3aed",
            padding: "0 12px",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {MESSAGE_SOURCES_TEXT.transcriptSendToKin}
        </button>
      ) : null}
    </div>
  );
}

export function WebsiteSourceActions({
  source,
  onRunCommand,
}: {
  source: SourceItem;
  onRunCommand?: (command: string) => void | Promise<void>;
}) {
  if (!onRunCommand || !source.link?.startsWith("http")) return null;

  return (
    <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <WebsiteActionButton
        label="サイトマップ表示"
        onClick={() => void onRunCommand(`Website Map: ${source.link}`)}
      />
    </div>
  );
}

function WebsiteActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 30,
        borderRadius: 999,
        border: "1px solid #bae6fd",
        background: "#f0f9ff",
        color: "#0369a1",
        padding: "0 12px",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
