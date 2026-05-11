"use client";

import React, { useState } from "react";
import { sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import { LibraryImportControls } from "@/components/panels/gpt/LibraryDrawerControls";
import LibraryItemCard from "@/components/panels/gpt/LibraryItemCard";
import type {
  LibraryDrawerProps,
  LibraryDrawerView,
} from "@/components/panels/gpt/LibraryDrawerTypes";
import {
  buildLibraryItemEditDraftCommand,
  insertImageIdIntoGptDraft,
} from "@/lib/app/reference-library/libraryDraftCommands";
import { fetchRagLibraryDocuments } from "@/lib/app/reference-library/ragLibraryDocumentsClient";
import {
  readRagLibraryReferenceLogs,
  type RagLibraryReferenceLogEntry,
} from "@/lib/app/reference-library/ragLibraryReferenceLog";
import type { RagLibraryStoredDocument } from "@/lib/app/reference-library/ragLibraryTypes";

const DB_DOCUMENT_ORDER_KEY = "rag_library_db_document_order";

const tabs: Array<{ id: LibraryDrawerView; label: string }> = [
  { id: "library", label: "ライブラリ" },
  { id: "images", label: "画像" },
  { id: "db", label: "DB" },
  { id: "dbLog", label: "DB参照ログ" },
];

export default function LibraryDrawer({
  multipartAssemblies,
  referenceLibraryItems,
  libraryRagIndexStates,
  libraryReferenceCount,
  libraryRagCandidateCount,
  imageLibraryReferenceCount,
  sourceDisplayCount,
  selectedTaskLibraryItemId,
  onSelectTaskLibraryItem,
  onMoveLibraryItem,
  onChangeLibraryItemMode,
  onIndexLibraryItemForRag,
  onStartAskAiModeSearch,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
  onDownloadMultipartAssembly,
  onDeleteMultipartAssembly,
  onDownloadStoredDocument,
  onDeleteStoredDocument,
  onDeleteSearchHistoryItem,
  onSaveSearchHistoryItem,
  onSaveStoredDocument,
  onShowLibraryItemInChat,
  onSendLibraryItemToKin,
  onShowAllLibraryItemsInChat,
  onSendAllLibraryItemsToKin,
  onDownloadLibraryItem,
  onUploadLibraryItemToGoogleDrive,
  onRenderPresentationPlanToPpt,
  onOpenGoogleDriveFolder,
  onImportGoogleDriveFile,
  onIndexGoogleDriveFolder,
  onImportGoogleDriveFolder,
  isMobile = false,
  onImportDeviceFile,
  onImportDeviceImageFile,
  deviceImportAccept,
  imageImportAccept,
  deviceImportDisabled = false,
  libraryViewRequest = null,
  activeLibraryView: controlledActiveLibraryView,
  onChangeLibraryView,
  setGptInputDraft,
}: LibraryDrawerProps) {
  const [driveImportMenuOpen, setDriveImportMenuOpen] = useState(false);
  const [uncontrolledActiveLibraryView, setUncontrolledActiveLibraryView] =
    useState<LibraryDrawerView>("library");
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftText, setDraftText] = useState("");
  const [dbDocuments, setDbDocuments] = useState<RagLibraryStoredDocument[]>([]);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbReferenceLogs, setDbReferenceLogs] = useState<
    RagLibraryReferenceLogEntry[]
  >([]);
  const collapseDbDocumentDetails = React.useCallback(() => {
    if (typeof document === "undefined") return;
    document
      .querySelectorAll<HTMLDetailsElement>("[data-db-document-card='true']")
      .forEach((details) => {
        details.open = false;
      });
  }, []);
  const deviceInputId = React.useId();
  const activeLibraryView =
    controlledActiveLibraryView ?? uncontrolledActiveLibraryView;
  const setActiveLibraryView = React.useCallback(
    (view: LibraryDrawerView) => {
      if (onChangeLibraryView) {
        onChangeLibraryView(view);
        return;
      }
      setUncontrolledActiveLibraryView(view);
    },
    [onChangeLibraryView]
  );

  React.useEffect(() => {
    if (controlledActiveLibraryView !== undefined) return;
    if (!libraryViewRequest) return;
    setActiveLibraryView(libraryViewRequest.view);
  }, [controlledActiveLibraryView, libraryViewRequest, setActiveLibraryView]);

  const loadDbDocuments = React.useCallback(async () => {
    setDbLoading(true);
    setDbError("");
    try {
      const result = await fetchRagLibraryDocuments({ limit: 50 });
      setDbConfigured(result.configured);
      setDbDocuments(result.documents);
      setDbLoaded(true);
    } catch (error) {
      setDbError(error instanceof Error ? error.message : "DB items failed to load.");
    } finally {
      setDbLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeLibraryView !== "db" || dbLoaded || dbLoading) return;
    void loadDbDocuments();
  }, [activeLibraryView, dbLoaded, dbLoading, loadDbDocuments]);

  const loadDbReferenceLogs = React.useCallback(() => {
    setDbReferenceLogs(readRagLibraryReferenceLogs());
  }, []);

  React.useEffect(() => {
    loadDbReferenceLogs();
    window.addEventListener(
      "rag-library-reference-log-updated",
      loadDbReferenceLogs
    );
    return () => {
      window.removeEventListener(
        "rag-library-reference-log-updated",
        loadDbReferenceLogs
      );
    };
  }, [loadDbReferenceLogs]);

  const handleDraftLibraryItemEditCommand = React.useCallback(
    (itemId: string) => {
      if (!setGptInputDraft) return;
      const item = referenceLibraryItems.find((entry) => entry.id === itemId);
      if (!item) return;
      const command = buildLibraryItemEditDraftCommand(item);
      if (!command) return;
      setGptInputDraft(command);
    },
    [referenceLibraryItems, setGptInputDraft]
  );

  const handleInsertImageIdToDraft = React.useCallback(
    (imageId: string) => {
      if (!setGptInputDraft) return;
      setGptInputDraft((current) => insertImageIdIntoGptDraft(current, imageId));
    },
    [setGptInputDraft]
  );

  const visibleItems =
    activeLibraryView === "images"
      ? referenceLibraryItems.filter(
          (item) => item.artifactType === "generated_image"
        )
      : activeLibraryView === "library"
        ? referenceLibraryItems.filter(
            (item) => item.artifactType !== "generated_image"
          )
        : [];

  return (
    <section
      style={{
        ...sectionCardStyle,
        minWidth: 0,
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <LibraryImportControls
        driveImportMenuOpen={driveImportMenuOpen}
        setDriveImportMenuOpen={setDriveImportMenuOpen}
        onOpenGoogleDriveFolder={onOpenGoogleDriveFolder}
        onImportGoogleDriveFile={onImportGoogleDriveFile}
        onIndexGoogleDriveFolder={onIndexGoogleDriveFolder}
        onImportGoogleDriveFolder={onImportGoogleDriveFolder}
        deviceInputId={deviceInputId}
        onImportDeviceFile={onImportDeviceFile}
        onImportDeviceImageFile={onImportDeviceImageFile}
        deviceImportAccept={mergeAcceptValues(deviceImportAccept, imageImportAccept)}
        deviceImportDisabled={deviceImportDisabled}
        onShowAllLibraryItemsInChat={onShowAllLibraryItemsInChat}
        onSendAllLibraryItemsToKin={onSendAllLibraryItemsToKin}
      />

      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 10,
          borderBottom: "1px solid #e2e8f0",
          overflowX: "auto",
        }}
        aria-label="ライブラリ表示切替"
      >
        {tabs.map((tab) => {
          const active = activeLibraryView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLibraryView(tab.id)}
              style={{
                border: 0,
                borderBottom: active
                  ? "2px solid #0f766e"
                  : "2px solid transparent",
                background: "transparent",
                color: active ? "#0f766e" : "#64748b",
                fontSize: 12,
                fontWeight: 800,
                padding: "7px 8px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeLibraryView === "db" ? (
        <LibraryDbPanel
          configured={dbConfigured}
          documents={dbDocuments}
          referenceLogs={dbReferenceLogs}
          candidateChunkLimit={libraryRagCandidateCount}
          onCollapseDbDocumentDetails={collapseDbDocumentDetails}
          loading={dbLoading}
          error={dbError}
          onRefresh={loadDbDocuments}
        />
      ) : activeLibraryView === "dbLog" ? (
        <LibraryDbLogPanel logs={dbReferenceLogs} onRefresh={loadDbReferenceLogs} />
      ) : visibleItems.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          {activeLibraryView === "images"
            ? "保存済み画像はまだありません。"
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
              libraryRagIndexStates={libraryRagIndexStates}
              libraryReferenceCount={libraryReferenceCount}
              imageLibraryReferenceCount={imageLibraryReferenceCount}
              sourceDisplayCount={sourceDisplayCount}
              selectedTaskLibraryItemId={selectedTaskLibraryItemId}
              onSelectTaskLibraryItem={onSelectTaskLibraryItem}
              onMoveLibraryItem={onMoveLibraryItem}
              onChangeLibraryItemMode={onChangeLibraryItemMode}
              onIndexLibraryItemForRag={onIndexLibraryItemForRag}
              onStartAskAiModeSearch={onStartAskAiModeSearch}
              onImportYouTubeTranscript={onImportYouTubeTranscript}
              onSendYouTubeTranscriptToKin={onSendYouTubeTranscriptToKin}
              onDownloadMultipartAssembly={onDownloadMultipartAssembly}
              onDeleteMultipartAssembly={onDeleteMultipartAssembly}
              onDownloadStoredDocument={onDownloadStoredDocument}
              onDeleteStoredDocument={onDeleteStoredDocument}
              onDeleteSearchHistoryItem={onDeleteSearchHistoryItem}
              onSaveSearchHistoryItem={onSaveSearchHistoryItem}
              onSaveStoredDocument={onSaveStoredDocument}
              onShowLibraryItemInChat={onShowLibraryItemInChat}
              onSendLibraryItemToKin={onSendLibraryItemToKin}
              onDownloadLibraryItem={onDownloadLibraryItem}
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
              onDraftLibraryItemEditCommand={handleDraftLibraryItemEditCommand}
              onInsertImageIdToDraft={handleInsertImageIdToDraft}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LibraryDbPanel({
  configured,
  documents,
  referenceLogs,
  candidateChunkLimit,
  onCollapseDbDocumentDetails,
  loading,
  error,
  onRefresh,
}: {
  configured: boolean;
  documents: RagLibraryStoredDocument[];
  referenceLogs: RagLibraryReferenceLogEntry[];
  candidateChunkLimit: number;
  onCollapseDbDocumentDetails: () => void;
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
}) {
  const [filterText, setFilterText] = React.useState("");
  const [documentOrder, setDocumentOrder] = React.useState<string[]>(() =>
    readDbDocumentOrder()
  );
  React.useEffect(() => {
    setDocumentOrder((current) => normalizeDbDocumentOrder(current, documents));
  }, [documents]);
  React.useEffect(() => {
    writeDbDocumentOrder(documentOrder);
  }, [documentOrder]);
  const orderedDocuments = React.useMemo(
    () => applyDbDocumentOrder(documents, documentOrder),
    [documents, documentOrder]
  );
  const stats = React.useMemo(
    () => buildDbDocumentStats(orderedDocuments, referenceLogs),
    [orderedDocuments, referenceLogs]
  );
  const candidateState = React.useMemo(
    () => buildDbCandidateState(orderedDocuments, candidateChunkLimit),
    [orderedDocuments, candidateChunkLimit]
  );
  const filteredDocuments = React.useMemo(
    () => filterDbDocuments(orderedDocuments, filterText),
    [orderedDocuments, filterText]
  );
  const referencedDocumentIds = React.useMemo(
    () =>
      new Set(
        referenceLogs.flatMap((log) =>
          log.matches.flatMap((match) => (match.documentId ? [match.documentId] : []))
        )
      ),
    [referenceLogs]
  );
  const moveDocument = React.useCallback(
    (documentId: string, action: "top" | "candidateBottom" | "outside") => {
      setDocumentOrder((current) =>
        moveDbDocumentInOrder({
          order: normalizeDbDocumentOrder(current, documents),
          documents,
          documentId,
          candidateChunkLimit,
          action,
        })
      );
      onCollapseDbDocumentDetails();
    },
    [candidateChunkLimit, documents, onCollapseDbDocumentDetails]
  );

  if (!configured) {
    return (
      <div style={placeholderStyle}>
        <div style={placeholderTitleStyle}>DB未設定</div>
        <div style={placeholderBodyStyle}>
          Supabaseの環境変数が未設定です。SUPABASE_URL と
          SUPABASE_SERVICE_ROLE_KEY を設定するとDB項目を表示できます。
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12, minWidth: 0, maxWidth: "100%" }}>
      <div style={panelHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={placeholderTitleStyle}>DB</div>
          <div style={placeholderBodyStyle}>
            登録済みDBドキュメントと、その配下のチャンクを表示します。
          </div>
        </div>
        <div style={dbHeaderActionsStyle}>
          <DbStatPill label="文書" value={stats.documentCount} />
          <DbStatPill
            label="候補"
            value={`${candidateState.includedChunkCount} / 上限${candidateChunkLimit}`}
          />
          <DbStatPill label="総チャンク" value={stats.chunkCount} />
          <DbStatPill
            label="直近参照"
            value={`${stats.referencedDocumentCount}文書 / ${stats.referencedChunkCount}チャンク`}
          />
          <button type="button" onClick={() => void onRefresh()} style={refreshButtonStyle}>
            更新
          </button>
        </div>
      </div>

      <label style={dbFilterLabelStyle}>
        <span style={dbFilterTextStyle}>DB内検索</span>
        <input
          type="search"
          value={filterText}
          onChange={(event) => setFilterText(event.currentTarget.value)}
          placeholder="タイトル、要約、チャンク本文、メタデータ"
          style={dbFilterInputStyle}
        />
      </label>

      {loading ? (
        <div style={placeholderStyle}>DBを読み込み中です。</div>
      ) : error ? (
        <div style={{ ...placeholderStyle, borderColor: "#fecaca", background: "#fef2f2" }}>
          <div style={{ ...placeholderTitleStyle, color: "#991b1b" }}>DB読込エラー</div>
          <div style={placeholderBodyStyle}>{error}</div>
        </div>
      ) : documents.length === 0 ? (
        <div style={placeholderStyle}>
          <div style={placeholderTitleStyle}>DB項目はまだありません</div>
          <div style={placeholderBodyStyle}>
            ライブラリカードの「DBへ送付」を実行すると、ここに表示されます。
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div style={placeholderStyle}>
          <div style={placeholderTitleStyle}>一致するDB項目はありません</div>
          <div style={placeholderBodyStyle}>
            検索語を減らすか、別のキーワードで絞り込んでください。
          </div>
        </div>
      ) : (
        filteredDocuments.map((document) => {
          const candidate = candidateState.documents.get(document.id);
          return (
          <details key={document.id} data-db-document-card="true" style={dbCardStyle}>
            <summary style={dbSummaryStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={dbTitleStyle}>{document.title}</div>
                <div style={dbMetaStyle}>
                  {document.itemType} / チャンク {document.chunks.length}
                  {document.updatedAt ? ` / ${formatDateTime(document.updatedAt)}` : ""}
                </div>
              </div>
              <div style={dbSummaryPillsStyle}>
                {candidate?.included ? (
                  <span style={dbCandidatePillStyle}>
                    候補内 {candidate.start + 1}-{candidate.end}
                  </span>
                ) : (
                  <span style={dbOutsidePillStyle}>候補外</span>
                )}
                {referencedDocumentIds.has(document.id) ? (
                  <span style={dbReferencedPillStyle}>直近参照</span>
                ) : null}
                <span style={dbPillStyle}>{document.chunks.length}チャンク</span>
              </div>
            </summary>
            <div style={dbCandidateActionsStyle}>
              <button
                type="button"
                onClick={() => moveDocument(document.id, "top")}
                style={smallDbButtonStyle}
              >
                候補に入れる
              </button>
              <button
                type="button"
                onClick={() => moveDocument(document.id, "outside")}
                style={smallDbButtonStyle}
              >
                候補外へ
              </button>
              <button
                type="button"
                onClick={() => moveDocument(document.id, "candidateBottom")}
                style={smallDbButtonStyle}
              >
                候補内の最下段へ
              </button>
            </div>
            {document.summary ? (
              <div style={dbSummaryTextStyle}>{document.summary}</div>
            ) : null}
            <div style={chunkListStyle}>
              {document.chunks.length === 0 ? (
                <div style={placeholderBodyStyle}>チャンクはありません。</div>
              ) : (
                document.chunks.map((chunk) => (
                  <div key={chunk.id} style={chunkCardStyle}>
                    <div style={chunkHeaderStyle}>
                      <span>Chunk {chunk.chunkIndex}</span>
                      <span>{chunk.tokenEstimate}トークン</span>
                    </div>
                    <div style={chunkContentStyle}>{chunk.content}</div>
                  </div>
                ))
              )}
            </div>
          </details>
          );
        })
      )}
    </div>
  );
}

function LibraryDbLogPanel({
  logs,
  onRefresh,
}: {
  logs: RagLibraryReferenceLogEntry[];
  onRefresh: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12, minWidth: 0, maxWidth: "100%" }}>
      <div style={panelHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={placeholderTitleStyle}>DB参照ログ</div>
          <div style={placeholderBodyStyle}>
            会話やタスクで実際に参照されたDB項目、チャンク、類似度、使用区分を記録します。
          </div>
        </div>
        <button type="button" onClick={onRefresh} style={refreshButtonStyle}>
          更新
        </button>
      </div>

      {logs.length === 0 ? (
        <div style={placeholderStyle}>
          <div style={placeholderTitleStyle}>参照ログはまだありません</div>
          <div style={placeholderBodyStyle}>
            RAG参照をONにして会話またはタスク操作を実行すると、DB検索結果がここに表示されます。
          </div>
        </div>
      ) : (
        logs.map((log) => (
          <details key={log.id} style={dbCardStyle} open={log === logs[0]}>
            <summary style={dbSummaryStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={dbTitleStyle}>
                  {log.usageBucket === "task" ? "タスク" : "会話"} /{" "}
                  {log.matches.length}件 / {log.contextChars}文字
                </div>
                <div style={dbMetaStyle}>
                  {formatDateTime(log.createdAt)}
                  {log.skippedReason ? ` / skipped: ${log.skippedReason}` : ""}
                </div>
              </div>
              <span style={dbPillStyle}>{log.matches.length}件</span>
            </summary>
            <div style={dbSummaryTextStyle}>Query: {log.query}</div>
            <div style={chunkListStyle}>
              {log.matches.length === 0 ? (
                <div style={placeholderBodyStyle}>
                  DB検索は実行されましたが、参照チャンクはありません。
                </div>
              ) : (
                log.matches.map((match, index) => (
                  <div
                    key={`${log.id}-${match.chunkId || index}`}
                    style={chunkCardStyle}
                  >
                    <div style={chunkHeaderStyle}>
                      <span>
                        {match.title} / chunk {match.chunkIndex}
                      </span>
                      <span>
                        {typeof match.similarity === "number"
                          ? match.similarity.toFixed(4)
                          : "similarity n/a"}
                      </span>
                    </div>
                    <div style={chunkContentStyle}>{match.contentPreview}</div>
                  </div>
                ))
              )}
            </div>
          </details>
        ))
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeAcceptValues(...values: string[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).join(",");
}

function readDbDocumentOrder() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DB_DOCUMENT_ORDER_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeDbDocumentOrder(order: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_DOCUMENT_ORDER_KEY, JSON.stringify(order));
}

function normalizeDbDocumentOrder(
  order: string[],
  documents: RagLibraryStoredDocument[]
) {
  const documentIds = new Set(documents.map((document) => document.id));
  const existing = order.filter((id) => documentIds.has(id));
  const existingSet = new Set(existing);
  return [
    ...existing,
    ...documents
      .map((document) => document.id)
      .filter((id) => !existingSet.has(id)),
  ];
}

export function applyDbDocumentOrder(
  documents: RagLibraryStoredDocument[],
  order: string[]
) {
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  return [...documents].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

export function buildDbCandidateState(
  documents: RagLibraryStoredDocument[],
  candidateChunkLimit: number
) {
  const limit = Math.max(0, Math.floor(candidateChunkLimit || 0));
  let cursor = 0;
  let includedChunkCount = 0;
  const state = new Map<
    string,
    { included: boolean; start: number; end: number }
  >();

  documents.forEach((document) => {
    const chunkCount = document.chunks.length;
    const start = cursor;
    const end = cursor + chunkCount;
    const included = chunkCount > 0 && start < limit;
    state.set(document.id, {
      included,
      start,
      end,
    });
    if (included) {
      includedChunkCount += chunkCount;
    }
    cursor = end;
  });

  return {
    documents: state,
    includedChunkCount,
    totalChunkCount: cursor,
  };
}

export function moveDbDocumentInOrder(params: {
  order: string[];
  documents: RagLibraryStoredDocument[];
  documentId: string;
  candidateChunkLimit: number;
  action: "top" | "candidateBottom" | "outside";
}) {
  const remaining = params.order.filter((id) => id !== params.documentId);
  if (params.action === "top") {
    return [params.documentId, ...remaining];
  }
  if (params.action === "candidateBottom") {
    const orderedRemaining = applyDbDocumentOrder(
      params.documents.filter((document) => document.id !== params.documentId),
      remaining
    );
    const candidateState = buildDbCandidateState(
      orderedRemaining,
      params.candidateChunkLimit
    );
    const firstOutsideIndex = orderedRemaining.findIndex(
      (document) => !candidateState.documents.get(document.id)?.included
    );
    if (firstOutsideIndex < 0) {
      return [...remaining, params.documentId];
    }
    const before = orderedRemaining.slice(0, firstOutsideIndex).map((document) => document.id);
    const after = orderedRemaining.slice(firstOutsideIndex).map((document) => document.id);
    return [...before, params.documentId, ...after];
  }

  const orderedRemaining = applyDbDocumentOrder(
    params.documents.filter((document) => document.id !== params.documentId),
    remaining
  );
  const candidateState = buildDbCandidateState(
    orderedRemaining,
    params.candidateChunkLimit
  );
  const firstOutsideIndex = orderedRemaining.findIndex(
    (document) => !candidateState.documents.get(document.id)?.included
  );
  if (firstOutsideIndex < 0) {
    return [...remaining, params.documentId];
  }
  const before = orderedRemaining.slice(0, firstOutsideIndex).map((document) => document.id);
  const after = orderedRemaining.slice(firstOutsideIndex).map((document) => document.id);
  return [...before, ...after, params.documentId];
}

export function buildDbDocumentStats(
  documents: RagLibraryStoredDocument[],
  referenceLogs: RagLibraryReferenceLogEntry[]
) {
  const referencedDocumentIds = new Set<string>();
  const referencedChunkIds = new Set<string>();
  referenceLogs.forEach((log) => {
    log.matches.forEach((match) => {
      if (match.documentId) referencedDocumentIds.add(match.documentId);
      if (match.chunkId) referencedChunkIds.add(match.chunkId);
    });
  });

  return {
    documentCount: documents.length,
    chunkCount: documents.reduce((sum, document) => sum + document.chunks.length, 0),
    referencedDocumentCount: referencedDocumentIds.size,
    referencedChunkCount: referencedChunkIds.size,
  };
}

export function filterDbDocuments(
  documents: RagLibraryStoredDocument[],
  filterText: string
) {
  const normalizedFilter = filterText.trim().toLowerCase();
  if (!normalizedFilter) return documents;
  return documents.filter((document) =>
    buildDbDocumentSearchText(document).includes(normalizedFilter)
  );
}

function buildDbDocumentSearchText(document: RagLibraryStoredDocument) {
  return [
    document.title,
    document.summary,
    document.itemType,
    document.artifactType,
    document.sourceId,
    JSON.stringify(document.metadata || {}),
    ...document.chunks.flatMap((chunk) => [
      chunk.content,
      JSON.stringify(chunk.metadata || {}),
    ]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function DbStatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <span style={dbStatPillStyle}>
      {label}: {typeof value === "number" ? value.toLocaleString("ja-JP") : value}
    </span>
  );
}

const placeholderStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #dbeafe",
  background: "#f8fafc",
  borderRadius: 8,
  padding: 14,
};

const placeholderTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
};

const placeholderBodyStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  lineHeight: 1.6,
  color: "#475569",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
  border: "1px solid #dbeafe",
  background: "#f8fafc",
  borderRadius: 8,
  padding: 10,
  flexWrap: "wrap",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const refreshButtonStyle: React.CSSProperties = {
  border: "1px solid #99f6e4",
  background: "#ffffff",
  color: "#0f766e",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  flexShrink: 0,
};

const dbHeaderActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  minWidth: 0,
  maxWidth: "100%",
};

const dbStatPillStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  background: "#ffffff",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 800,
  color: "#334155",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const dbFilterLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  minWidth: 0,
  maxWidth: "100%",
};

const dbFilterTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#334155",
};

const dbFilterInputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  minWidth: 0,
  boxSizing: "border-box",
};

const dbCardStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  background: "#ffffff",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const dbSummaryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  cursor: "pointer",
  flexWrap: "wrap",
  minWidth: 0,
  maxWidth: "100%",
};

const dbTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const dbMetaStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "#64748b",
  overflowWrap: "anywhere",
};

const dbSummaryPillsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  minWidth: 0,
  maxWidth: "100%",
};

const dbPillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#047857",
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: 999,
  padding: "2px 8px",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const dbCandidatePillStyle: React.CSSProperties = {
  ...dbPillStyle,
  color: "#6d28d9",
  background: "#f5f3ff",
  borderColor: "#ddd6fe",
};

const dbOutsidePillStyle: React.CSSProperties = {
  ...dbPillStyle,
  color: "#64748b",
  background: "#f8fafc",
  borderColor: "#cbd5e1",
};

const dbReferencedPillStyle: React.CSSProperties = {
  ...dbPillStyle,
  color: "#0369a1",
  background: "#f0f9ff",
  borderColor: "#bae6fd",
};

const dbCandidateActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  marginTop: 8,
  minWidth: 0,
  maxWidth: "100%",
};

const smallDbButtonStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#ffffff",
  color: "#1d4ed8",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const dbSummaryTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#334155",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const chunkListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 10,
  minWidth: 0,
  maxWidth: "100%",
};

const chunkCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const chunkHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 11,
  fontWeight: 800,
  color: "#475569",
  flexWrap: "wrap",
  minWidth: 0,
  maxWidth: "100%",
};

const chunkContentStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#0f172a",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 160,
  overflow: "auto",
};
