"use client";

import React from "react";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { sectionTitle } from "@/components/panels/gpt/LibraryDrawerControls";
import type { LibraryDrawerProps } from "@/components/panels/gpt/LibraryDrawerTypes";
import type { ReferenceLibraryItem } from "@/types/chat";

export type AskAiModeCandidate = {
  query: string;
  snippet: string;
};

export function getAskAiModeCandidates(
  item: ReferenceLibraryItem
): AskAiModeCandidate[] {
  return (item.askAiModeItems || [])
    .map((candidate) => ({
      query:
        candidate.question?.trim() ||
        candidate.title?.trim() ||
        candidate.snippet?.trim() ||
        "",
      snippet: candidate.snippet?.trim() || "",
    }))
    .filter((candidate, index, array) => {
      if (!candidate.query) return false;
      return array.findIndex((entry) => entry.query === candidate.query) === index;
    });
}

export default function LibraryItemSearchPreview({
  item,
  askAiModeCandidates,
  sourceDisplayCount,
  isMobile,
  onStartAskAiModeSearch,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
}: {
  item: ReferenceLibraryItem;
  askAiModeCandidates: AskAiModeCandidate[];
  sourceDisplayCount: number;
  isMobile: boolean;
  onStartAskAiModeSearch: LibraryDrawerProps["onStartAskAiModeSearch"];
  onImportYouTubeTranscript: LibraryDrawerProps["onImportYouTubeTranscript"];
  onSendYouTubeTranscriptToKin: LibraryDrawerProps["onSendYouTubeTranscriptToKin"];
}) {
  return (
    <>
      {askAiModeCandidates.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {sectionTitle(GPT_LIBRARY_DRAWER_TEXT.askAiModeTitle)}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {askAiModeCandidates.map((candidate) => (
              <button
                key={`${item.id}:${candidate.query}`}
                type="button"
                onClick={() => void onStartAskAiModeSearch(candidate.query)}
                style={{
                  ...pillButton,
                  background: "#fff7ed",
                  color: "#c2410c",
                  border: "1px solid #fdba74",
                  maxWidth: "100%",
                }}
                title={candidate.snippet || candidate.query}
              >
                {GPT_LIBRARY_DRAWER_TEXT.askAiContinuePrefix} {candidate.query}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {item.sources?.length ? (
        <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#475569" }}>
          {item.sources
            .slice(0, Math.max(1, sourceDisplayCount || 1))
            .map((source, sourceIndex) => (
              <div
                key={`${item.id}-${sourceIndex}`}
                style={{
                  display: "grid",
                  gap: 4,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                  padding: "8px 10px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {sourceIndex + 1}. {source.title}
                  {source.link ? ` | ${source.link}` : ""}
                </div>
                {source.sourceType === "youtube_video" ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => void onImportYouTubeTranscript(source)}
                      style={{
                        ...pillButton,
                        background: "#fff",
                        color: "#b91c1c",
                        border: "1px solid #fca5a5",
                      }}
                    >
                      {GPT_LIBRARY_DRAWER_TEXT.importTranscript}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSendYouTubeTranscriptToKin(source)}
                      style={{
                        ...pillButton,
                        background: "#fff",
                        color: "#7c3aed",
                        border: "1px solid #c4b5fd",
                      }}
                    >
                      {GPT_LIBRARY_DRAWER_TEXT.sendTranscriptToKin}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      ) : null}
      <LibraryItemPreviewTextArea value={item.excerptText} isMobile={isMobile} />
    </>
  );
}

export function LibraryItemPreviewTextArea({
  value,
  isMobile,
}: {
  value: string;
  isMobile: boolean;
}) {
  return (
    <textarea
      readOnly
      value={value}
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
  );
}
