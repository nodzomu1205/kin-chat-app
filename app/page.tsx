"use client";

import { useCallback, useEffect, useRef } from "react";
import ChatAppShell from "@/components/layout/ChatAppShell";
import { useKinManager } from "@/hooks/useKinManager";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useAutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useChatPageLifecycle } from "@/hooks/useChatPageLifecycle";
import { useTaskDraftWorkspace } from "@/hooks/useTaskDraftWorkspace";
import { useArchiveCompletedTaskResults } from "@/hooks/useArchiveCompletedTaskResults";
import { useChatPagePanelsComposition } from "@/hooks/useChatPagePanelsComposition";
import { useChatPageReferenceDomain } from "@/hooks/useChatPageReferenceDomain";
import { useChatPageTaskProtocolDomain } from "@/hooks/useChatPageTaskProtocolDomain";
import { useChatPageUiState } from "@/hooks/useChatPageUiState";
import { useChatPageWorkspaceDomainInputs } from "@/hooks/useChatPageWorkspaceDomainInputs";
import {
  CHAT_PAGE_MOBILE_BREAKPOINT,
  resolveCurrentKinDisplayLabel,
} from "@/lib/app/ui-state/chatPageDefaults";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";
import type { RegisteredTask } from "@/lib/app/task-registration/taskRegistration";
import type { LibraryReferenceMode } from "@/components/panels/gpt/gptPanelTypes";

type LibraryRuntimeSnapshot = {
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceMode: LibraryReferenceMode;
  libraryReferenceCount: number;
  libraryIndexResponseCount: number;
  imageLibraryReferenceEnabled: boolean;
  imageLibraryReferenceCount: number;
};

export default function ChatApp() {
  const chatUi = useChatPageUiState(CHAT_PAGE_MOBILE_BREAKPOINT);
  const taskDraftWorkspace = useTaskDraftWorkspace();

  const gptOptions = usePersistedGptOptions();
  const autoBridge = useAutoBridgeSettings();

  const tokenUsage = useTokenTracking();

  const kinManager = useKinManager();
  const currentKinDisplayLabel = resolveCurrentKinDisplayLabel({
    kinList: kinManager.kinList,
    currentKin: kinManager.currentKin,
  });

  const searchDomain = useSearchHistory({
    applyIngestUsage: tokenUsage.applyIngestUsage,
    autoGenerateLibrarySummaries: gptOptions.autoGenerateLibrarySummary,
  });
  const taskProtocolDomain = useChatPageTaskProtocolDomain({
    currentKin: kinManager.currentKin,
    currentTaskDraft: taskDraftWorkspace.currentTaskDraft,
    gptMessages: chatUi.gptMessages,
    setCurrentTaskDraft: taskDraftWorkspace.setCurrentTaskDraft,
    deleteSearchHistoryItemBase: searchDomain.deleteSearchHistoryItem,
  });

  useChatPageLifecycle({
    currentKin: kinManager.currentKin,
    ensureKinState: taskProtocolDomain.ensureKinState,
    setCurrentSessionId: chatUi.setCurrentSessionId,
  });

  const referenceDomain = useChatPageReferenceDomain({
    searchHistory: searchDomain.searchHistory,
    searchHistoryStorageMB: searchDomain.searchHistoryStorageMB,
    sourceDisplayCount: searchDomain.sourceDisplayCount,
    uploadKind: gptOptions.uploadKind,
    ingestMode: gptOptions.ingestMode,
    imageDetail: gptOptions.imageDetail,
    fileReadPolicy: gptOptions.fileReadPolicy,
    imageLibraryImportEnabled: gptOptions.imageLibraryImportEnabled,
    imageLibraryImportMode: gptOptions.imageLibraryImportMode,
    compactCharLimit: gptOptions.compactCharLimit,
    simpleImageCharLimit: gptOptions.simpleImageCharLimit,
    autoGenerateLibrarySummary: gptOptions.autoGenerateLibrarySummary,
    currentTaskId: taskDraftWorkspace.currentTaskDraft.id || undefined,
    currentTaskTitle: taskProtocolDomain.taskProtocolView.currentTaskTitle,
    currentKinDisplayLabel,
    getCurrentTaskCharConstraint: () =>
      taskProtocolDomain.getCurrentTaskCharConstraint() as TaskCharConstraint | null,
    setKinInput: chatUi.setKinInput,
    setPendingKinInjectionBlocks: chatUi.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: chatUi.setPendingKinInjectionIndex,
    setPendingKinInjectionPurpose: chatUi.setPendingKinInjectionPurpose,
    setGptInput: chatUi.setGptInput,
    gptMessages: chatUi.gptMessages,
    setGptMessages: chatUi.setGptMessages,
    setIngestLoading: chatUi.setIngestLoading,
    gptMemoryRuntime: taskProtocolDomain.gptMemoryRuntime,
    applyChatUsage: tokenUsage.applyChatUsage,
    applyIngestUsage: tokenUsage.applyIngestUsage,
    applyCompressionUsage: tokenUsage.applyCompressionUsage,
    focusGptPanel: chatUi.focusGptPanel,
    focusKinPanel: chatUi.focusKinPanel,
    setFinalizeReviewed: taskProtocolDomain.taskProtocolView.setFinalizeReviewed,
  });

  const activeLibraryOverrideRef = useRef<{
    taskId: string;
    previous: LibraryRuntimeSnapshot;
  } | null>(null);

  const restoreLibraryRuntimeSettings = useCallback(() => {
    const active = activeLibraryOverrideRef.current;
    if (!active) return;
    referenceDomain.setAutoLibraryReferenceEnabled(
      active.previous.autoLibraryReferenceEnabled
    );
    referenceDomain.setLibraryReferenceMode(active.previous.libraryReferenceMode);
    referenceDomain.setLibraryReferenceCount(active.previous.libraryReferenceCount);
    referenceDomain.setLibraryIndexResponseCount(
      active.previous.libraryIndexResponseCount
    );
    referenceDomain.setImageLibraryReferenceEnabled(
      active.previous.imageLibraryReferenceEnabled
    );
    referenceDomain.setImageLibraryReferenceCount(
      active.previous.imageLibraryReferenceCount
    );
    activeLibraryOverrideRef.current = null;
  }, [referenceDomain]);

  const applyRegisteredTaskRuntimeSettings = useCallback((task: RegisteredTask) => {
    restoreLibraryRuntimeSettings();
    activeLibraryOverrideRef.current = {
      taskId: task.draft.taskId || task.id,
      previous: {
        autoLibraryReferenceEnabled: referenceDomain.autoLibraryReferenceEnabled,
        libraryReferenceMode: referenceDomain.libraryReferenceMode,
        libraryReferenceCount: referenceDomain.libraryReferenceCount,
        libraryIndexResponseCount: referenceDomain.libraryIndexResponseCount,
        imageLibraryReferenceEnabled:
          referenceDomain.imageLibraryReferenceEnabled,
        imageLibraryReferenceCount: referenceDomain.imageLibraryReferenceCount,
      },
    };

    referenceDomain.setAutoLibraryReferenceEnabled(task.librarySettings.enabled);
    referenceDomain.setLibraryReferenceMode(task.librarySettings.mode);
    referenceDomain.setLibraryReferenceCount(task.librarySettings.count);
    referenceDomain.setImageLibraryReferenceEnabled(
      task.librarySettings.imageEnabled ?? true
    );
    referenceDomain.setImageLibraryReferenceCount(
      task.librarySettings.imageCount ?? 3
    );
    if (task.librarySettings.count > referenceDomain.libraryIndexResponseCount) {
      referenceDomain.setLibraryIndexResponseCount(task.librarySettings.count);
    }
  }, [referenceDomain, restoreLibraryRuntimeSettings]);

  const currentRuntimeTaskId = taskProtocolDomain.taskProtocol.runtime.currentTaskId;
  const currentRuntimeTaskStatus = taskProtocolDomain.taskProtocol.runtime.taskStatus;

  useEffect(() => {
    const active = activeLibraryOverrideRef.current;
    if (!active) return;
    if (
      currentRuntimeTaskId === active.taskId &&
      currentRuntimeTaskStatus === "completed"
    ) {
      restoreLibraryRuntimeSettings();
    }
  }, [
    currentRuntimeTaskId,
    currentRuntimeTaskStatus,
    restoreLibraryRuntimeSettings,
  ]);

  useArchiveCompletedTaskResults({
    documents: referenceDomain.allDocuments,
    progressViews: taskProtocolDomain.taskProtocolView.progressViews,
    archiveTask: taskProtocolDomain.taskProtocolView.onClearTaskProgress,
  });

  const { workspaceState, workspaceActions, workspaceServices } =
    useChatPageWorkspaceDomainInputs({
      chatUi,
      taskDraftWorkspace,
      gptOptions,
      autoBridge,
      tokenUsage,
      kinManager,
      currentKinDisplayLabel,
      searchDomain,
      taskProtocolDomain,
      referenceDomain,
      applyRegisteredTaskRuntimeSettings,
    });

  const { kinPanel, gptPanel } = useChatPagePanelsComposition({
    input: {
      state: workspaceState,
      actions: workspaceActions,
      services: workspaceServices,
    },
    kinBottomRef: chatUi.kinBottomRef,
    gptBottomRef: chatUi.gptBottomRef,
  });

  return (
    <ChatAppShell
      isSinglePanelLayout={chatUi.isSinglePanelLayout}
      activePanelTab={chatUi.activePanelTab}
      kinPanel={kinPanel}
      gptPanel={gptPanel}
    />
  );
}

