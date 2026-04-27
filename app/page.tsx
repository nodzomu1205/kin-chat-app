"use client";

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

