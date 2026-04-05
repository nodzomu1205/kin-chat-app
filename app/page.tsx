"use client";

import { useEffect, useRef, useState } from "react";
import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory } from "@/hooks/useGptMemory";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { createSession, getSessions } from "@/lib/storage";
import type { MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";
import { generateId } from "@/lib/uuid";
import type { SearchContext, TaskDraft } from "@/types/task";
import { createEmptyTaskDraft } from "@/types/task";
import { resetTaskDraft } from "@/lib/app/taskDraftHelpers";
import { useGptActions } from "@/hooks/useGptActions";
import { useIngestActions } from "@/hooks/useIngestActions";

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 1180;

export default function ChatApp() {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [kinLoading, setKinLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [pendingKinInjectionBlocks, setPendingKinInjectionBlocks] = useState<
    string[]
  >([]);
  const [pendingKinInjectionIndex, setPendingKinInjectionIndex] = useState(0);
  const [, setCurrentSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>("kin");
  const [currentTaskDraft, setCurrentTaskDraft] = useState<TaskDraft>(
    createEmptyTaskDraft()
  );
  const [lastSearchContext, setLastSearchContext] = useState<SearchContext | null>(
    null
  );

  const isMobile = useResponsive(MOBILE_BREAKPOINT);
  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

  const {
    responseMode,
    setResponseMode,
    uploadKind,
    setUploadKind,
    ingestMode,
    setIngestMode,
    imageDetail,
    setImageDetail,
    postIngestAction,
    setPostIngestAction,
    fileReadPolicy,
    setFileReadPolicy,
  } = usePersistedGptOptions();

  const {
    tokenStats,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    applyIngestUsage,
    resetTokenStats,
  } = useTokenTracking();

  const {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    kinList,
    currentKin,
    kinStatus,
    setKinStatus,
    connectKin,
    switchKin,
    disconnectKin,
    removeKin,
    renameKin,
  } = useKinManager();

  const {
    gptState,
    setGptState,
    gptStateRef,
    getProvisionalMemory,
    handleGptMemory,
    resetGptForCurrentKin,
    ensureKinState,
    removeKinState,
    chatRecentLimit,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(currentKin);

  const currentKinProfile = kinList.find((kin) => kin.id === currentKin) ?? null;
  const currentKinLabel = currentKinProfile?.label ?? null;

  useEffect(() => {
    const sessions = getSessions();

    if (sessions.length === 0) {
      const newSession = createSession();
      setCurrentSessionId(newSession.id);
      return;
    }

    setCurrentSessionId(sessions[0].id);
  }, []);

  useEffect(() => {
    if (!currentKin) return;
    ensureKinState(currentKin);
  }, [currentKin, ensureKinState]);

  useEffect(() => {
    if (isMobile) {
      setActiveTab((prev) => (prev === "gpt" ? "gpt" : "kin"));
    }
  }, [isMobile]);

  const clearPendingKinInjection = () => {
    setPendingKinInjectionBlocks([]);
    setPendingKinInjectionIndex(0);
  };

  const resetCurrentTaskDraft = () => {
    setCurrentTaskDraft(resetTaskDraft());
  };

  const updateTaskDraftFields = (patch: Partial<TaskDraft>) => {
    setCurrentTaskDraft((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  };

  const {
    sendToGpt,
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
    sendTaskToKinDraft,
    getTaskBaseText,
  } = useGptActions({
    gptInput,
    setGptInput,
    gptLoading,
    setGptLoading,
    gptMessages,
    setGptMessages,
    gptStateRef,
    setGptState,
    getProvisionalMemory,
    handleGptMemory,
    chatRecentLimit,
    responseMode,
    currentTaskDraft,
    setCurrentTaskDraft,
    lastSearchContext,
    setLastSearchContext,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    setKinInput,
    isMobile,
    onSwitchToKin: () => setActiveTab("kin"),
  });

  const { injectFileToKinDraft } = useIngestActions({
    ingestLoading,
    setIngestLoading,
    uploadKind,
    setUploadKind,
    ingestMode,
    imageDetail,
    fileReadPolicy,
    currentTaskDraft,
    setCurrentTaskDraft,
    gptMessages,
    setGptMessages,
    applyIngestUsage,
    applyTaskUsage,
    setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex,
    setKinInput,
    isMobile,
    onSwitchToKin: () => setActiveTab("kin"),
    getTaskBaseText,
  });

  const resetBothPanels = () => {
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();
    clearPendingKinInjection();
    resetCurrentTaskDraft();
    setLastSearchContext(null);

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleConnectKin = () => {
    connectKin();
    resetBothPanels();
  };

  const handleSwitchKin = (id: string) => {
    switchKin(id);
    resetBothPanels();
  };

  const handleDisconnectKin = () => {
    disconnectKin();
    resetBothPanels();
  };

  const handleRemoveKin = (id: string) => {
    removeKinState(id);
    removeKin(id);
    resetBothPanels();
  };

  const sendToKin = async () => {
    if (!kinInput.trim() || !currentKin || kinLoading) return;

    setKinStatus("idle");
    setKinLoading(true);

    const text = kinInput.trim();
    const currentPendingBlock =
      pendingKinInjectionBlocks[pendingKinInjectionIndex] ?? null;

    setKinMessages((prev) => [...prev, { id: generateId(), role: "user", text }]);
    setKinInput("");

    try {
      const res = await fetch("/api/kindroid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, kinId: currentKin }),
      });

      const data = await res.json();

      setKinMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "kin",
          text:
            typeof data.reply === "string" && data.reply.trim()
              ? data.reply
              : "⚠️ Kinの返答取得に失敗しました",
        },
      ]);

      setKinStatus("connected");

      const sentPendingPart =
        typeof currentPendingBlock === "string" && text === currentPendingBlock.trim();

      if (sentPendingPart) {
        const nextIndex = pendingKinInjectionIndex + 1;

        if (nextIndex < pendingKinInjectionBlocks.length) {
          setPendingKinInjectionIndex(nextIndex);
          setKinInput(pendingKinInjectionBlocks[nextIndex]);
        } else {
          clearPendingKinInjection();
        }
      }
    } catch (error) {
      console.error(error);
      setKinStatus("error");
    } finally {
      setKinLoading(false);
    }
  };

  const sendLastKinToGptDraft = () => {
    const last = [...kinMessages].reverse().find((m) => m.role === "kin");
    if (!last) return;

    setGptInput(last.text);
    if (isMobile) setActiveTab("gpt");
  };

  const sendLastGptToKinDraft = () => {
    const last = [...gptMessages].reverse().find((m) => m.role === "gpt");
    if (!last) return;

    setKinInput(last.text);
    if (isMobile) setActiveTab("kin");
  };

  const resetKinMessages = () => {
    setKinMessages([]);
    clearPendingKinInjection();
  };

  const handleResetGpt = () => {
    setGptMessages([]);
    resetGptForCurrentKin();
    resetTokenStats();
    resetCurrentTaskDraft();
    setLastSearchContext(null);
  };

  const handleSaveMemorySettings = (next: MemorySettings) => {
    updateMemorySettings(next);
  };

  const handleResetMemorySettings = () => {
    resetMemorySettings();
  };

  const kinPanel = (
    <KinPanel
      kinIdInput={kinIdInput}
      setKinIdInput={setKinIdInput}
      kinNameInput={kinNameInput}
      setKinNameInput={setKinNameInput}
      connectKin={handleConnectKin}
      disconnectKin={handleDisconnectKin}
      kinStatus={kinStatus}
      currentKin={currentKin}
      currentKinLabel={currentKinLabel}
      kinList={kinList}
      switchKin={handleSwitchKin}
      removeKin={handleRemoveKin}
      renameKin={renameKin}
      kinMessages={kinMessages}
      kinInput={kinInput}
      setKinInput={setKinInput}
      sendToKin={sendToKin}
      sendLastKinToGptDraft={sendLastKinToGptDraft}
      resetKinMessages={resetKinMessages}
      pendingInjectionCurrentPart={
        pendingKinInjectionBlocks.length > 0 ? pendingKinInjectionIndex + 1 : 0
      }
      pendingInjectionTotalParts={pendingKinInjectionBlocks.length}
      kinBottomRef={kinBottomRef}
      isMobile={isMobile}
      onSwitchPanel={() => setActiveTab("gpt")}
      loading={kinLoading}
    />
  );

  const gptPanel = (
    <GptPanel
      currentKin={currentKin}
      currentKinLabel={currentKinLabel}
      kinStatus={kinStatus}
      gptState={gptState}
      gptMessages={gptMessages}
      gptInput={gptInput}
      setGptInput={setGptInput}
      sendToGpt={sendToGpt}
      runPrepTaskFromInput={runPrepTaskFromInput}
      runDeepenTaskFromLast={runDeepenTaskFromLast}
      runUpdateTaskFromInput={runUpdateTaskFromInput}
      runUpdateTaskFromLastGptMessage={runUpdateTaskFromLastGptMessage}
      runAttachSearchResultToTask={runAttachSearchResultToTask}
      resetGptForCurrentKin={handleResetGpt}
      sendLastGptToKinDraft={sendLastGptToKinDraft}
      sendTaskToKinDraft={sendTaskToKinDraft}
      injectFileToKinDraft={injectFileToKinDraft}
      canInjectFile={!gptLoading && !ingestLoading}
      loading={gptLoading}
      ingestLoading={ingestLoading}
      gptBottomRef={gptBottomRef}
      memorySettings={memorySettings}
      defaultMemorySettings={defaultMemorySettings}
      onSaveMemorySettings={handleSaveMemorySettings}
      onResetMemorySettings={handleResetMemorySettings}
      tokenStats={tokenStats}
      responseMode={responseMode}
      onChangeResponseMode={setResponseMode}
      uploadKind={uploadKind}
      ingestMode={ingestMode}
      imageDetail={imageDetail}
      postIngestAction={postIngestAction}
      fileReadPolicy={fileReadPolicy}
      onChangeUploadKind={setUploadKind}
      onChangeIngestMode={setIngestMode}
      onChangeImageDetail={setImageDetail}
      onChangePostIngestAction={setPostIngestAction}
      onChangeFileReadPolicy={setFileReadPolicy}
      pendingInjectionCurrentPart={
        pendingKinInjectionBlocks.length > 0 ? pendingKinInjectionIndex + 1 : 0
      }
      pendingInjectionTotalParts={pendingKinInjectionBlocks.length}
      onSwitchPanel={() => setActiveTab("kin")}
      isMobile={isMobile}
      currentTaskDraft={currentTaskDraft}
      onChangeTaskTitle={(value) =>
        updateTaskDraftFields({
          title: value,
          taskName: value.trim() || currentTaskDraft.taskName,
        })
      }
      onChangeTaskUserInstruction={(value) =>
        updateTaskDraftFields({
          userInstruction: value,
        })
      }
      onChangeTaskBody={(value) =>
        updateTaskDraftFields({
          body: value,
          mergedText: value,
        })
      }
    />
  );

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        backgroundPosition: "top left",
        overflow: "visible",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isMobile ? 0 : 12,
          padding: isMobile ? 0 : 12,
          overflow: "visible",
        }}
      >
        {isMobile ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              position: "relative",
              overflow: "visible",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: activeTab === "kin" ? "flex" : "none",
                width: "100%",
              }}
            >
              {kinPanel}
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: activeTab === "gpt" ? "flex" : "none",
                width: "100%",
              }}
            >
              {gptPanel}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{kinPanel}</div>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{gptPanel}</div>
          </>
        )}
      </div>
    </div>
  );
}