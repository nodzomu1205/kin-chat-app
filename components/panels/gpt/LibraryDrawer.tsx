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
import {
  readRagLibraryDbDocumentOrder,
  writeRagLibraryCandidateDocumentIds,
  writeRagLibraryDbDocumentOrder,
} from "@/lib/app/reference-library/ragLibraryDbCandidateStorage";
import {
  compactRagLibraryDocuments,
  deleteRagLibraryDocument,
  fetchRagLibraryDocuments,
} from "@/lib/app/reference-library/ragLibraryDocumentsClient";
import {
  analyzeRagLibraryOrganization,
  createOrganizedRagLibraryDocument,
} from "@/lib/app/reference-library/ragLibraryOrganizationClient";
import type {
  RagLibraryOrganizationAnalysisResult,
  RagLibraryOrganizationGroup,
  RagLibraryOrganizedDocumentResult,
} from "@/lib/app/reference-library/ragLibraryOrganizationTypes";
import {
  buildRagLibraryDuplicateGroups,
  type RagLibraryDuplicateGroup,
} from "@/lib/app/reference-library/ragLibraryDuplicateDetection";
import {
  readRagLibraryReferenceLogs,
  type RagLibraryReferenceLogEntry,
} from "@/lib/app/reference-library/ragLibraryReferenceLog";
import type { RagLibraryStoredDocument } from "@/lib/app/reference-library/ragLibraryTypes";

type DbOrganizationSessionState = {
  analysis: RagLibraryOrganizationAnalysisResult | null;
  analysisDocumentIds: string[];
  result: RagLibraryOrganizedDocumentResult | null;
  analysisLoading: boolean;
  organizingGroupId: string;
};

const DB_ORGANIZATION_SESSION_KEY = "rag_library_db_organization_session";

const dbOrganizationSession: DbOrganizationSessionState = {
  analysis: null,
  analysisDocumentIds: [],
  result: null,
  analysisLoading: false,
  organizingGroupId: "",
};

let dbOrganizationAnalysisPromise:
  | Promise<RagLibraryOrganizationAnalysisResult>
  | null = null;
let dbOrganizationCreatePromise:
  | Promise<RagLibraryOrganizedDocumentResult>
  | null = null;

function readDbOrganizationSession(): Pick<
  DbOrganizationSessionState,
  "analysis" | "analysisDocumentIds" | "result"
> {
  if (typeof window === "undefined") {
    return { analysis: null, analysisDocumentIds: [], result: null };
  }
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(DB_ORGANIZATION_SESSION_KEY) || "{}"
    ) as Partial<DbOrganizationSessionState>;
    return {
      analysis: parsed.analysis || null,
      analysisDocumentIds: Array.isArray(parsed.analysisDocumentIds)
        ? parsed.analysisDocumentIds.filter(
            (value): value is string => typeof value === "string"
          )
        : [],
      result: parsed.result || null,
    };
  } catch {
    return { analysis: null, analysisDocumentIds: [], result: null };
  }
}

function writeDbOrganizationSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    DB_ORGANIZATION_SESSION_KEY,
    JSON.stringify({
      analysis: dbOrganizationSession.analysis,
      analysisDocumentIds: dbOrganizationSession.analysisDocumentIds,
      result: dbOrganizationSession.result,
    })
  );
}

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
  onRunCommand,
  applyDbOrganizationUsage,
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
  const [dbSemanticDuplicateGroups, setDbSemanticDuplicateGroups] = useState<
    RagLibraryDuplicateGroup[]
  >([]);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [dbLoaded, setDbLoaded] = useState(false);
  const [deletingDbDocumentId, setDeletingDbDocumentId] = useState("");
  const [compactingDbGroupId, setCompactingDbGroupId] = useState("");
  const [dbOrganizationAnalysis, setDbOrganizationAnalysis] =
    useState<RagLibraryOrganizationAnalysisResult | null>(
      () => dbOrganizationSession.analysis || readDbOrganizationSession().analysis
    );
  const [dbOrganizationLoading, setDbOrganizationLoading] = useState(
    () => dbOrganizationSession.analysisLoading
  );
  const [organizingDbGroupId, setOrganizingDbGroupId] = useState(
    () => dbOrganizationSession.organizingGroupId
  );
  const [dbOrganizationResult, setDbOrganizationResult] =
    useState<RagLibraryOrganizedDocumentResult | null>(
      () => dbOrganizationSession.result || readDbOrganizationSession().result
    );
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
    const restored = readDbOrganizationSession();
    if (restored.analysis && !dbOrganizationSession.analysis) {
      dbOrganizationSession.analysis = restored.analysis;
      dbOrganizationSession.analysisDocumentIds = restored.analysisDocumentIds;
      setDbOrganizationAnalysis(restored.analysis);
    }
    if (restored.result && !dbOrganizationSession.result) {
      dbOrganizationSession.result = restored.result;
      setDbOrganizationResult(restored.result);
    }
  }, []);

  React.useEffect(() => {
    if (!dbOrganizationAnalysisPromise) return;
    let cancelled = false;
    setDbOrganizationLoading(true);
    dbOrganizationAnalysisPromise
      .then((result) => {
        if (cancelled) return;
        setDbOrganizationAnalysis(result);
      })
      .catch(() => {
        // The request owner surfaces the error; remounted drawers just follow state.
      })
      .finally(() => {
        if (cancelled) return;
        setDbOrganizationLoading(dbOrganizationSession.analysisLoading);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!dbOrganizationCreatePromise) return;
    let cancelled = false;
    setOrganizingDbGroupId(dbOrganizationSession.organizingGroupId);
    dbOrganizationCreatePromise
      .then((result) => {
        if (cancelled) return;
        setDbOrganizationResult(result);
      })
      .catch(() => {
        // The request owner surfaces the error; remounted drawers just follow state.
      })
      .finally(() => {
        if (cancelled) return;
        setOrganizingDbGroupId(dbOrganizationSession.organizingGroupId);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (controlledActiveLibraryView !== undefined) return;
    if (!libraryViewRequest) return;
    setActiveLibraryView(libraryViewRequest.view);
  }, [controlledActiveLibraryView, libraryViewRequest, setActiveLibraryView]);

  const loadDbDocuments = React.useCallback(async () => {
    setDbLoading(true);
    setDbError("");
    try {
      const result = await fetchRagLibraryDocuments({
        duplicateLimit: 30,
        duplicateThreshold: 0.68,
      });
      setDbConfigured(result.configured);
      setDbDocuments(result.documents);
      setDbSemanticDuplicateGroups(result.semanticDuplicateGroups);
      setDbLoaded(true);
    } catch (error) {
      setDbError(error instanceof Error ? error.message : "DB items failed to load.");
    } finally {
      setDbLoading(false);
    }
  }, []);

  const handleDeleteDbDocument = React.useCallback(
    async (documentId: string, title: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          `DBから「${title || "Untitled"}」を削除します。配下のチャンクも削除されます。よろしいですか？`
        );
        if (!confirmed) return;
      }
      setDeletingDbDocumentId(documentId);
      setDbError("");
      try {
        await deleteRagLibraryDocument(documentId);
        setDbDocuments((current) =>
          current.filter((document) => document.id !== documentId)
        );
        setDbSemanticDuplicateGroups((current) =>
          current.filter((group) => !group.documentIds.includes(documentId))
        );
      } catch (error) {
        setDbError(error instanceof Error ? error.message : "DB item delete failed.");
      } finally {
        setDeletingDbDocumentId("");
      }
    },
    []
  );

  const handleCompactDbDocuments = React.useCallback(
    async (group: RagLibraryDuplicateGroup) => {
      if (group.documentIds.length < 2) return;
      const title = `統合: ${group.titles.slice(0, 2).join(" / ")}`;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          `近似候補 ${group.documentIds.length}文書から、重複を圧縮した統合DB文書を新規作成します。元文書は残します。よろしいですか？`
        );
        if (!confirmed) return;
      }
      setCompactingDbGroupId(group.id);
      setDbError("");
      try {
        await compactRagLibraryDocuments({
          documentIds: group.documentIds,
          title,
        });
        await loadDbDocuments();
      } catch (error) {
        setDbError(error instanceof Error ? error.message : "DB compaction failed.");
      } finally {
        setCompactingDbGroupId("");
      }
    },
    [loadDbDocuments]
  );

  const handleAnalyzeDbOrganization = React.useCallback(async (documentIds?: string[]) => {
    const selectedDocumentIds = normalizeSelectedDbDocumentIds(documentIds || []);
    if (
      dbOrganizationSession.analysis &&
      sameStringSet(dbOrganizationSession.analysisDocumentIds, selectedDocumentIds)
    ) {
      setDbOrganizationAnalysis(dbOrganizationSession.analysis);
      return;
    }
    if (dbOrganizationAnalysisPromise) {
      setDbOrganizationLoading(true);
      try {
        const result = await dbOrganizationAnalysisPromise;
        setDbOrganizationAnalysis(result);
      } finally {
        setDbOrganizationLoading(dbOrganizationSession.analysisLoading);
      }
      return;
    }

    dbOrganizationSession.analysisLoading = true;
    setDbOrganizationLoading(true);
    dbOrganizationSession.result = null;
    setDbOrganizationResult(null);
    setDbError("");
    dbOrganizationAnalysisPromise = analyzeRagLibraryOrganization({
      documentIds: selectedDocumentIds,
    });
    try {
      const result = await dbOrganizationAnalysisPromise;
      if (result.usage) {
        applyDbOrganizationUsage?.(result.usage);
      }
      dbOrganizationSession.analysis = result;
      dbOrganizationSession.analysisDocumentIds = selectedDocumentIds;
      writeDbOrganizationSession();
      setDbOrganizationAnalysis(result);
    } catch (error) {
      setDbError(
        error instanceof Error ? error.message : "DB organization analysis failed."
      );
    } finally {
      dbOrganizationAnalysisPromise = null;
      dbOrganizationSession.analysisLoading = false;
      setDbOrganizationLoading(false);
    }
  }, [applyDbOrganizationUsage]);

  const removeDbOrganizationGroup = React.useCallback((groupId: string) => {
    setDbOrganizationAnalysis((current) => {
      if (!current) return current;
      const groups = current.groups.filter((group) => group.id !== groupId);
      if (groups.length === current.groups.length) return current;
      const next = { ...current, groups };
      dbOrganizationSession.analysis = next;
      writeDbOrganizationSession();
      return next;
    });
  }, []);

  const handleCreateOrganizedDbDocument = React.useCallback(
    async (group: RagLibraryOrganizationGroup, deleteSourceDocuments: boolean) => {
      if (group.documentIds.length < 2) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          deleteSourceDocuments
            ? `「${group.targetTitle}」を新しい整理済みDB文書として作成し、作成後に素材の旧DB文書 ${group.documentIds.length}件を削除します。よろしいですか？`
            : `「${group.targetTitle}」を新しい整理済みDB文書として作成します。素材の旧DB文書は残します。よろしいですか？`
        );
        if (!confirmed) return;
      }
      dbOrganizationSession.organizingGroupId = group.id;
      setOrganizingDbGroupId(group.id);
      dbOrganizationSession.result = null;
      setDbOrganizationResult(null);
      setDbError("");
      try {
        dbOrganizationCreatePromise = createOrganizedRagLibraryDocument({
          documentIds: group.documentIds,
          targetTitle: group.targetTitle,
          groupLabel: group.label,
          deleteSourceDocuments,
        });
        const result = await dbOrganizationCreatePromise;
        if (result.usage) {
          applyDbOrganizationUsage?.(result.usage);
        }
        dbOrganizationSession.result = result;
        writeDbOrganizationSession();
        setDbOrganizationResult(result);
        removeDbOrganizationGroup(group.id);
        await loadDbDocuments();
      } catch (error) {
        setDbError(error instanceof Error ? error.message : "DB organization failed.");
      } finally {
        dbOrganizationCreatePromise = null;
        dbOrganizationSession.organizingGroupId = "";
        setOrganizingDbGroupId("");
      }
    },
    [applyDbOrganizationUsage, loadDbDocuments, removeDbOrganizationGroup]
  );

  React.useEffect(() => {
    if (!dbLoaded) return;
    const existingDocumentIds = new Set(dbDocuments.map((document) => document.id));
    setDbOrganizationAnalysis((current) => {
      if (!current) return current;
      const groups = current.groups.filter((group) =>
        group.documentIds.every((documentId) => existingDocumentIds.has(documentId))
      );
      if (groups.length === current.groups.length) return current;
      const next = { ...current, groups };
      dbOrganizationSession.analysis = next;
      writeDbOrganizationSession();
      return next;
    });
  }, [dbDocuments, dbLoaded]);

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
          semanticDuplicateGroups={dbSemanticDuplicateGroups}
          referenceLogs={dbReferenceLogs}
          candidateChunkLimit={libraryRagCandidateCount}
          onCollapseDbDocumentDetails={collapseDbDocumentDetails}
          deletingDocumentId={deletingDbDocumentId}
          onDeleteDocument={handleDeleteDbDocument}
          compactingGroupId={compactingDbGroupId}
          onCompactDocuments={handleCompactDbDocuments}
          organizationAnalysis={dbOrganizationAnalysis}
          organizationLoading={dbOrganizationLoading}
          organizationResult={dbOrganizationResult}
          organizingGroupId={organizingDbGroupId}
          onAnalyzeOrganization={handleAnalyzeDbOrganization}
          onCreateOrganizedDocument={handleCreateOrganizedDbDocument}
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
              onRunCommand={onRunCommand}
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
  semanticDuplicateGroups,
  referenceLogs,
  candidateChunkLimit,
  onCollapseDbDocumentDetails,
  deletingDocumentId,
  onDeleteDocument,
  compactingGroupId,
  onCompactDocuments,
  organizationAnalysis,
  organizationLoading,
  organizationResult,
  organizingGroupId,
  onAnalyzeOrganization,
  onCreateOrganizedDocument,
  loading,
  error,
  onRefresh,
}: {
  configured: boolean;
  documents: RagLibraryStoredDocument[];
  semanticDuplicateGroups: RagLibraryDuplicateGroup[];
  referenceLogs: RagLibraryReferenceLogEntry[];
  candidateChunkLimit: number;
  onCollapseDbDocumentDetails: () => void;
  deletingDocumentId: string;
  onDeleteDocument: (documentId: string, title: string) => void | Promise<void>;
  compactingGroupId: string;
  onCompactDocuments: (group: RagLibraryDuplicateGroup) => void | Promise<void>;
  organizationAnalysis: RagLibraryOrganizationAnalysisResult | null;
  organizationLoading: boolean;
  organizationResult: RagLibraryOrganizedDocumentResult | null;
  organizingGroupId: string;
  onAnalyzeOrganization: (documentIds: string[]) => void | Promise<void>;
  onCreateOrganizedDocument: (
    group: RagLibraryOrganizationGroup,
    deleteSourceDocuments: boolean
  ) => void | Promise<void>;
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
}) {
  const [filterText, setFilterText] = React.useState("");
  const [documentOrder, setDocumentOrder] = React.useState<string[]>(() =>
    readRagLibraryDbDocumentOrder()
  );
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>(
    []
  );
  React.useEffect(() => {
    setDocumentOrder((current) => normalizeDbDocumentOrder(current, documents));
  }, [documents]);
  React.useEffect(() => {
    writeRagLibraryDbDocumentOrder(documentOrder);
  }, [documentOrder]);
  const orderedDocuments = React.useMemo(
    () => applyDbDocumentOrder(documents, documentOrder),
    [documents, documentOrder]
  );
  const stats = React.useMemo(
    () => buildDbDocumentStats(orderedDocuments, referenceLogs),
    [orderedDocuments, referenceLogs]
  );
  const duplicateGroups = React.useMemo(
    () =>
      mergeDuplicateGroups(
        buildRagLibraryDuplicateGroups(orderedDocuments),
        semanticDuplicateGroups
      ),
    [orderedDocuments, semanticDuplicateGroups]
  );
  const candidateState = React.useMemo(
    () => buildDbCandidateState(orderedDocuments, candidateChunkLimit),
    [orderedDocuments, candidateChunkLimit]
  );
  React.useEffect(() => {
    writeRagLibraryCandidateDocumentIds(
      orderedDocuments
        .filter((document) => candidateState.documents.get(document.id)?.included)
        .map((document) => document.id)
    );
  }, [candidateState, orderedDocuments]);
  const filteredDocuments = React.useMemo(
    () => filterDbDocuments(orderedDocuments, filterText),
    [orderedDocuments, filterText]
  );
  React.useEffect(() => {
    const documentIds = new Set(documents.map((document) => document.id));
    setSelectedDocumentIds((current) =>
      current.filter((documentId) => documentIds.has(documentId))
    );
  }, [documents]);
  const selectedDocumentIdSet = React.useMemo(
    () => new Set(selectedDocumentIds),
    [selectedDocumentIds]
  );
  const allVisibleDocumentsSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((document) => selectedDocumentIdSet.has(document.id));
  const selectVisibleDocuments = React.useCallback(() => {
    setSelectionMode(true);
    setSelectedDocumentIds((current) => {
      const visibleIds = filteredDocuments.map((document) => document.id);
      const visibleIdSet = new Set(visibleIds);
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !visibleIdSet.has(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }, [filteredDocuments]);
  const toggleSelectedDocument = React.useCallback((documentId: string) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  }, []);
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
          <DbStatPill label="重複候補" value={duplicateGroups.length} />
          <DbStatPill
            label="直近参照"
            value={`${stats.referencedDocumentCount}文書 / ${stats.referencedChunkCount}チャンク`}
          />
          <button type="button" onClick={() => void onRefresh()} style={refreshButtonStyle}>
            更新
          </button>
        </div>
      </div>

      {duplicateGroups.length > 0 ? (
        <DbDuplicateGroupsPanel
          groups={duplicateGroups}
          compactingGroupId={compactingGroupId}
          onCompactDocuments={onCompactDocuments}
        />
      ) : null}

      <DbOrganizationPanel
        analysis={organizationAnalysis}
        loading={organizationLoading}
        result={organizationResult}
        organizingGroupId={organizingGroupId}
        selectionMode={selectionMode}
        selectedDocumentCount={selectedDocumentIds.length}
        visibleDocumentCount={filteredDocuments.length}
        allVisibleDocumentsSelected={allVisibleDocumentsSelected}
        onToggleSelectionMode={() => setSelectionMode((current) => !current)}
        onSelectVisibleDocuments={selectVisibleDocuments}
        onAnalyze={() => onAnalyzeOrganization(selectedDocumentIds)}
        onCreateOrganizedDocument={onCreateOrganizedDocument}
      />

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
          const selected = selectedDocumentIdSet.has(document.id);
          return (
          <div key={document.id} style={selected ? selectedDbCardStyle : dbCardStyle}>
            {selectionMode ? (
              <label style={dbSelectionRowStyle}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelectedDocument(document.id)}
                  style={dbSelectionCheckboxStyle}
                  aria-label={`DB analysis target: ${document.title}`}
                />
                <span>{selected ? "選択済み" : "分析対象に選択"}</span>
              </label>
            ) : null}
          <details data-db-document-card="true">
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
              <button
                type="button"
                disabled={deletingDocumentId === document.id}
                onClick={() => void onDeleteDocument(document.id, document.title)}
                style={{
                  ...smallDbButtonStyle,
                  borderColor: "#fecaca",
                  color: "#b91c1c",
                  opacity: deletingDocumentId === document.id ? 0.6 : 1,
                }}
              >
                {deletingDocumentId === document.id ? "削除中" : "DB削除"}
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
          </div>
          );
        })
      )}
    </div>
  );
}

export function DbDuplicateGroupsPanel({
  groups,
  compactingGroupId,
  onCompactDocuments,
}: {
  groups: RagLibraryDuplicateGroup[];
  compactingGroupId: string;
  onCompactDocuments: (group: RagLibraryDuplicateGroup) => void | Promise<void>;
}) {
  return (
    <details style={duplicatePanelStyle}>
      <summary style={duplicateSummaryStyle}>
        <span>重複・圧縮候補</span>
        <span style={dbOutsidePillStyle}>{groups.length}件</span>
      </summary>
      <div style={duplicateBodyStyle}>
        {groups.map((group) => (
          <div key={group.id} style={duplicateGroupStyle}>
            <div style={chunkHeaderStyle}>
              <span>{formatDuplicateReason(group.reason)}</span>
              <span>
                {group.documentCount}文書 / {group.chunkCount}チャンク / 約
                {group.totalTokenEstimate.toLocaleString("ja-JP")}トークン
                {typeof group.similarity === "number"
                  ? ` / 類似度${group.similarity.toFixed(2)}`
                  : ""}
              </span>
            </div>
            <div style={dbSummaryTextStyle}>
              {group.titles.join(" / ")}
            </div>
            <div style={dbCandidateActionsStyle}>
              <button
                type="button"
                disabled={compactingGroupId === group.id}
                onClick={() => void onCompactDocuments(group)}
                style={{
                  ...smallDbButtonStyle,
                  borderColor: "#fde68a",
                  color: "#92400e",
                  opacity: compactingGroupId === group.id ? 0.6 : 1,
                }}
              >
                {compactingGroupId === group.id ? "統合中" : "統合DB文書を作成"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export function DbOrganizationPanel({
  analysis,
  loading,
  result,
  organizingGroupId,
  selectionMode,
  selectedDocumentCount,
  visibleDocumentCount,
  allVisibleDocumentsSelected,
  onToggleSelectionMode,
  onSelectVisibleDocuments,
  onAnalyze,
  onCreateOrganizedDocument,
}: {
  analysis: RagLibraryOrganizationAnalysisResult | null;
  loading: boolean;
  result: RagLibraryOrganizedDocumentResult | null;
  organizingGroupId: string;
  selectionMode: boolean;
  selectedDocumentCount: number;
  visibleDocumentCount: number;
  allVisibleDocumentsSelected: boolean;
  onToggleSelectionMode: () => void;
  onSelectVisibleDocuments: () => void;
  onAnalyze: () => void | Promise<void>;
  onCreateOrganizedDocument: (
    group: RagLibraryOrganizationGroup,
    deleteSourceDocuments: boolean
  ) => void | Promise<void>;
}) {
  const groups = analysis?.groups || [];
  return (
    <details style={organizationPanelStyle}>
      <summary style={organizationSummaryStyle}>
        <span>DB整理</span>
        <span style={dbOutsidePillStyle}>
          {loading ? "分析中" : `${groups.length}候補`}
        </span>
      </summary>
      <div style={duplicateBodyStyle}>
        <div style={placeholderBodyStyle}>
          DB内の文書からカテゴリーやテーマを抽出し、RAGで必要部分だけ拾いやすい
          知識単位へ再構成します。再編後のチャンク数は、検索精度を優先するため
          元より増える場合があります。
        </div>
        <div style={dbCandidateActionsStyle}>
          <button
            type="button"
            onClick={onToggleSelectionMode}
            style={{
              ...smallDbButtonStyle,
              borderColor: selectionMode ? "#99f6e4" : "#cbd5e1",
              color: selectionMode ? "#0f766e" : "#475569",
            }}
          >
            対象選択
          </button>
          <button
            type="button"
            disabled={visibleDocumentCount === 0}
            onClick={onSelectVisibleDocuments}
            style={{
              ...smallDbButtonStyle,
              borderColor: "#bae6fd",
              color: "#0369a1",
              opacity: visibleDocumentCount === 0 ? 0.6 : 1,
            }}
          >
            {allVisibleDocumentsSelected ? "一括解除" : "一括選択"}
          </button>
          <button
            type="button"
            disabled={loading || selectedDocumentCount === 0}
            onClick={() => void onAnalyze()}
            style={{
              ...smallDbButtonStyle,
              borderColor: "#99f6e4",
              color: "#0f766e",
              opacity: loading || selectedDocumentCount === 0 ? 0.6 : 1,
            }}
          >
            {loading ? "分析中" : "分析"}
          </button>
        </div>
        <div style={dbMetaStyle}>
          分析対象: {selectedDocumentCount.toLocaleString("ja-JP")}文書
          {selectionMode
            ? ` / 表示中 ${visibleDocumentCount.toLocaleString("ja-JP")}文書`
            : " / 対象選択で文書を選択してください"}
        </div>
        {analysis ? (
          <div style={dbMetaStyle}>
            前回分析対象: {analysis.documentsScanned.toLocaleString("ja-JP")}文書 /{" "}
            {analysis.chunksScanned.toLocaleString("ja-JP")}チャンク / 約
            {analysis.sourceTokenEstimate.toLocaleString("ja-JP")}トークン
          </div>
        ) : null}
        {result ? (
          <div style={organizationResultStyle}>
            作成済み: {result.title} / 出力 {result.outputChunkCount}チャンク / 約
            {result.outputTokenEstimate.toLocaleString("ja-JP")}トークン
            {result.deletedSourceDocumentCount > 0
              ? ` / 旧文書${result.deletedSourceDocumentCount}件を削除`
              : ""}
          </div>
        ) : null}
        {groups.length === 0 && analysis && !loading ? (
          <div style={placeholderBodyStyle}>
            まとまった再編候補は見つかりませんでした。
          </div>
        ) : null}
        {groups.map((group) => {
          const busy = organizingGroupId === group.id;
          return (
            <div key={group.id} style={organizationGroupStyle}>
              <div style={chunkHeaderStyle}>
                <span>{group.targetTitle}</span>
                <span>
                  素材 {group.sourceDocumentCount}文書 / {group.sourceChunkCount}
                  チャンク / 推奨 {group.suggestedChunkCount}チャンク前後
                </span>
              </div>
              <div style={dbSummaryTextStyle}>
                {group.category} / {group.theme}
                {group.entities.length ? ` / ${group.entities.join(", ")}` : ""}
              </div>
              {group.rationale ? (
                <div style={placeholderBodyStyle}>{group.rationale}</div>
              ) : null}
              <div style={dbCandidateActionsStyle}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onCreateOrganizedDocument(group, false)}
                  style={{
                    ...smallDbButtonStyle,
                    borderColor: "#bfdbfe",
                    color: "#1d4ed8",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? "作成中" : "整理済みDB文書を作成"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onCreateOrganizedDocument(group, true)}
                  style={{
                    ...smallDbButtonStyle,
                    borderColor: "#fecaca",
                    color: "#b91c1c",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  作成後に旧文書を削除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function formatDuplicateReason(reason: RagLibraryDuplicateGroup["reason"]) {
  if (reason === "same_content_hash") return "同一文書候補";
  if (reason === "same_chunk_text") return "同一チャンク候補";
  if (reason === "similar_document") return "近似文書候補";
  return "近似チャンク候補";
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
            DB参照をONにして会話またはタスク操作を実行すると、DB検索結果がここに表示されます。
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
            {log.originalQuery && log.originalQuery !== log.query ? (
              <div style={dbSummaryTextStyle}>User: {log.originalQuery}</div>
            ) : null}
            <div style={dbSummaryTextStyle}>DB Query: {log.query}</div>
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

function normalizeSelectedDbDocumentIds(documentIds: string[]) {
  return Array.from(new Set(documentIds.map((id) => id.trim()).filter(Boolean)))
    .sort();
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = normalizeSelectedDbDocumentIds(left);
  const normalizedRight = normalizeSelectedDbDocumentIds(right);
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
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

function mergeDuplicateGroups(
  exactGroups: RagLibraryDuplicateGroup[],
  semanticGroups: RagLibraryDuplicateGroup[]
) {
  const seen = new Set<string>();
  return [...exactGroups, ...semanticGroups]
    .filter((group) => {
      const key = [
        group.reason,
        [...group.documentIds].sort().join(","),
        [...group.chunkIds].sort().join(","),
      ].join(":");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const similarityDelta = (right.similarity ?? 1) - (left.similarity ?? 1);
      if (similarityDelta !== 0) return similarityDelta;
      return right.totalTokenEstimate - left.totalTokenEstimate;
    });
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
  const keywords = normalizedFilter.split(/\s+/).filter(Boolean);
  return documents.filter((document) => {
    const searchText = buildDbDocumentSearchText(document);
    return keywords.every((keyword) => searchText.includes(keyword));
  });
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#dbeafe",
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#dbeafe",
  background: "#f8fafc",
  borderRadius: 8,
  padding: 10,
  flexWrap: "wrap",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const refreshButtonStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#99f6e4",
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#dbeafe",
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  minWidth: 0,
  boxSizing: "border-box",
};

const duplicatePanelStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#fde68a",
  background: "#fffbeb",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const duplicateSummaryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
  color: "#92400e",
  flexWrap: "wrap",
};

const duplicateBodyStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 8,
  minWidth: 0,
  maxWidth: "100%",
};

const duplicateGroupStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#fde68a",
  background: "#ffffff",
  borderRadius: 8,
  padding: 8,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const organizationPanelStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#99f6e4",
  background: "#f0fdfa",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const organizationSummaryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
  color: "#0f766e",
  flexWrap: "wrap",
};

const organizationGroupStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#99f6e4",
  background: "#ffffff",
  borderRadius: 8,
  padding: 8,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const organizationResultStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#a7f3d0",
  background: "#ecfdf5",
  borderRadius: 8,
  padding: 8,
  fontSize: 12,
  fontWeight: 700,
  color: "#047857",
  overflowWrap: "anywhere",
};

const dbCardStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#dbeafe",
  background: "#ffffff",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const selectedDbCardStyle: React.CSSProperties = {
  ...dbCardStyle,
  borderColor: "#5eead4",
  background: "#f0fdfa",
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

const dbSelectionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  fontSize: 12,
  fontWeight: 800,
  color: "#0f766e",
  cursor: "pointer",
};

const dbSelectionCheckboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  accentColor: "#0f766e",
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#a7f3d0",
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#bfdbfe",
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
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#e2e8f0",
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
