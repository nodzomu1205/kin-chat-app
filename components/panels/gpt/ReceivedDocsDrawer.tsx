"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
  GptPanelReferenceProps,
  GptPanelSettingsProps,
  LibraryItemModeOverride,
} from "@/components/panels/gpt/gptPanelTypes";
import { pillButton } from "@/components/panels/gpt/gptPanelStyles";
import {
  formatUpdatedAt,
  sectionCardStyle,
} from "@/components/panels/gpt/gptDrawerShared";
import { GPT_RECEIVED_DOCS_TEXT } from "@/components/panels/gpt/gptUiText";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";

type LibraryTab = "all" | "kin" | "ingest" | "search";

type Props = Pick<
  GptPanelReferenceProps,
  | "multipartAssemblies"
  | "referenceLibraryItems"
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
> &
  Pick<
    GptPanelSettingsProps,
    | "libraryReferenceCount"
    | "sourceDisplayCount"
    | "onOpenGoogleDriveFolder"
    | "onImportFromGoogleDrive"
  > & {
  initialTab?: LibraryTab;
  isMobile?: boolean;
};

function tabButton(active: boolean): React.CSSProperties {
  return {
    ...pillButton,
    background: active ? "#ecfeff" : "#fff",
    color: "#0f766e",
    border: "1px solid #99f6e4",
  };
}

function iconButton(tone: "default" | "danger" = "default"): React.CSSProperties {
  return {
    ...pillButton,
    minWidth: 26,
    width: 26,
    height: 26,
    padding: 0,
    background: "#fff",
    color: tone === "danger" ? "#dc2626" : "#0f766e",
    border: tone === "danger" ? "1px solid #fecaca" : "1px solid #99f6e4",
    fontSize: 13,
    lineHeight: 1,
  };
}

function typeLabel(itemType: "search" | "kin_created" | "ingested_file") {
  return GPT_RECEIVED_DOCS_TEXT.typeLabels[itemType];
}

function sectionTitle(text: string) {
  return <div style={{ fontWeight: 700, color: "#0f172a" }}>{text}</div>;
}

export default function ReceivedDocsDrawer({
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
  onUploadLibraryItemToGoogleDrive,
  onOpenGoogleDriveFolder,
  onImportFromGoogleDrive,
  initialTab = "all",
  isMobile = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const visibleItems = useMemo(() => {
    if (activeTab === "all") return referenceLibraryItems;
    if (activeTab === "kin") {
      return referenceLibraryItems.filter((item) => item.itemType === "kin_created");
    }
    if (activeTab === "ingest") {
      return referenceLibraryItems.filter((item) => item.itemType === "ingested_file");
    }
    return referenceLibraryItems.filter((item) => item.itemType === "search");
  }, [activeTab, referenceLibraryItems]);

  const getAskAiModeCandidates = (
    item: Props["referenceLibraryItems"][number]
  ) =>
    (item.askAiModeItems || [])
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

  useEffect(() => {
    if (expandedId && !visibleItems.some((item) => item.id === expandedId)) {
      setExpandedId("");
    }
  }, [expandedId, visibleItems]);

  return (
    <section style={{ ...sectionCardStyle, minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={onOpenGoogleDriveFolder}
          style={{
            ...pillButton,
            background: "#ffffff",
            color: "#2563eb",
            border: "1px solid #bfdbfe",
          }}
        >
          {GPT_GOOGLE_DRIVE_TEXT.settings.openFolder}
        </button>
        <button
          type="button"
          onClick={() => void onImportFromGoogleDrive()}
          style={{
            ...pillButton,
            background: "#ffffff",
            color: "#0f766e",
            border: "1px solid #99f6e4",
          }}
        >
          {GPT_GOOGLE_DRIVE_TEXT.settings.importFromDrive}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setActiveTab("all")} style={tabButton(activeTab === "all")}>
          {GPT_RECEIVED_DOCS_TEXT.tabs.all}
        </button>
        <button type="button" onClick={() => setActiveTab("kin")} style={tabButton(activeTab === "kin")}>
          {GPT_RECEIVED_DOCS_TEXT.tabs.kin}
        </button>
        <button type="button" onClick={() => setActiveTab("ingest")} style={tabButton(activeTab === "ingest")}>
          {GPT_RECEIVED_DOCS_TEXT.tabs.ingest}
        </button>
        <button type="button" onClick={() => setActiveTab("search")} style={tabButton(activeTab === "search")}>
          {GPT_RECEIVED_DOCS_TEXT.tabs.search}
        </button>
      </div>

      {referenceLibraryItems.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          {GPT_RECEIVED_DOCS_TEXT.emptyAll}
        </div>
      ) : visibleItems.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          {GPT_RECEIVED_DOCS_TEXT.emptyFiltered}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {visibleItems.map((item) => {
            const isExpanded = item.id === expandedId;
            const isEditing = item.id === editingId;
            const priorityIndex =
              referenceLibraryItems.findIndex((entry) => entry.id === item.id) + 1;
            const multipartSource =
              item.itemType === "kin_created"
                ? multipartAssemblies.find((entry) => `kin:${entry.id}` === item.sourceId) || null
                : null;
            const askAiModeCandidates =
              item.itemType === "search" ? getAskAiModeCandidates(item) : [];

            return (
              <div
                key={item.id}
                style={{
                  border: isExpanded ? "1px solid #99f6e4" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: isExpanded ? "#ecfeff" : "#fff",
                  padding: "10px 12px",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
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
                    <div
                      suppressHydrationWarning
                      style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}
                    >
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
                    {priorityIndex > 0 && priorityIndex <= libraryReferenceCount ? (
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
                        {GPT_RECEIVED_DOCS_TEXT.refPrefix}
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
                        {GPT_RECEIVED_DOCS_TEXT.taskSelected}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onMoveLibraryItem(item.id, "up")}
                      style={iconButton()}
                      title={GPT_RECEIVED_DOCS_TEXT.moveUpTitle}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveLibraryItem(item.id, "down")}
                      style={iconButton()}
                      title={GPT_RECEIVED_DOCS_TEXT.moveDownTitle}
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
                      title={GPT_RECEIVED_DOCS_TEXT.deleteTitle}
                    >
                      ×
                    </button>
                  </div>
                </div>

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
                    {GPT_RECEIVED_DOCS_TEXT.useForTask}
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
                      {GPT_RECEIVED_DOCS_TEXT.download}
                    </button>
                  ) : null}

                  <select
                    value={item.modeOverride || "default"}
                    onChange={(e) =>
                      onChangeLibraryItemMode(
                        item.id,
                        e.target.value as LibraryItemModeOverride
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
                    <option value="default">{GPT_RECEIVED_DOCS_TEXT.modeOptions.default}</option>
                    <option value="summary_only">{GPT_RECEIVED_DOCS_TEXT.modeOptions.summary_only}</option>
                    <option value="summary_with_excerpt">{GPT_RECEIVED_DOCS_TEXT.modeOptions.summary_with_excerpt}</option>
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
                      {GPT_RECEIVED_DOCS_TEXT.edit}
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
                      💬
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSendLibraryItemToKin(item.id)}
                      style={iconButton()}
                      title={GPT_GOOGLE_DRIVE_TEXT.cardActions.sendToKin}
                      aria-label={GPT_GOOGLE_DRIVE_TEXT.cardActions.sendToKin}
                    >
                      📨
                    </button>
                    <button
                      type="button"
                      onClick={() => void onUploadLibraryItemToGoogleDrive(item.id)}
                      style={iconButton()}
                      title={GPT_GOOGLE_DRIVE_TEXT.cardActions.uploadToDrive}
                      aria-label={GPT_GOOGLE_DRIVE_TEXT.cardActions.uploadToDrive}
                    >
                      ☁
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid #dbe4e8",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {sectionTitle(GPT_RECEIVED_DOCS_TEXT.previewTitle)}

                    <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
                      <div>
                        <strong>{GPT_RECEIVED_DOCS_TEXT.fields.type}:</strong> {typeLabel(item.itemType)}
                      </div>
                      <div>
                        <strong>{GPT_RECEIVED_DOCS_TEXT.fields.summary}:</strong>{" "}
                        {item.summary || GPT_RECEIVED_DOCS_TEXT.fields.none}
                      </div>
                      {item.taskTitle ? (
                        <div>
                          <strong>{GPT_RECEIVED_DOCS_TEXT.fields.taskName}:</strong> {item.taskTitle}
                        </div>
                      ) : null}
                      {item.taskId ? (
                        <div>
                          <strong>{GPT_RECEIVED_DOCS_TEXT.fields.taskId}:</strong> #{item.taskId}
                        </div>
                      ) : null}
                      {item.kinName ? (
                        <div>
                          <strong>{GPT_RECEIVED_DOCS_TEXT.fields.kin}:</strong> {item.kinName}
                        </div>
                      ) : null}
                      {item.completedAt ? (
                        <div suppressHydrationWarning>
                          <strong>{GPT_RECEIVED_DOCS_TEXT.fields.completedAt}:</strong>{" "}
                          {formatUpdatedAt(item.completedAt)}
                        </div>
                      ) : null}
                      {multipartSource ? (
                        <div>
                          <strong>{GPT_RECEIVED_DOCS_TEXT.fields.multipart}:</strong>{" "}
                          {multipartSource.parts.length}/
                          {multipartSource.totalParts}
                        </div>
                      ) : null}
                    </div>

                    {item.itemType === "search" ? (
                      <>
                        {askAiModeCandidates.length > 0 ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            {sectionTitle(GPT_RECEIVED_DOCS_TEXT.askAiModeTitle)}
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
                                  {GPT_RECEIVED_DOCS_TEXT.askAiContinuePrefix} {candidate.query}
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
                                        {GPT_RECEIVED_DOCS_TEXT.importTranscript}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void onSendYouTubeTranscriptToKin(source)
                                        }
                                        style={{
                                          ...pillButton,
                                          background: "#fff",
                                          color: "#7c3aed",
                                          border: "1px solid #c4b5fd",
                                        }}
                                      >
                                        {GPT_RECEIVED_DOCS_TEXT.sendTranscriptToKin}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                          </div>
                        ) : null}
                        <textarea
                          readOnly
                          value={item.excerptText}
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
                      </>
                    ) : isEditing ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
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
                          onChange={(e) => setDraftSummary(e.target.value)}
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
                          onChange={(e) => setDraftText(e.target.value)}
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
                            {GPT_RECEIVED_DOCS_TEXT.save}
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
                            {GPT_RECEIVED_DOCS_TEXT.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        readOnly
                        value={item.excerptText}
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
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
