"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import type {
  GptBottomTab,
  GptPanelProps,
  GptTopDrawerTab,
  LocalMemorySettingsInput,
} from "./gptPanelTypes";
import GptHeader from "./GptHeader";
import GptMetaDrawer from "./GptMetaDrawer";
import GptSettingsDrawer from "./GptSettingsDrawer";
import GptTaskStatusDrawer from "./GptTaskStatusDrawer";
import GptToolbar from "./GptToolbar";
import GptComposer from "./GptComposer";
import {
  chatBodyStyle,
  drawerWrapStyle,
  footerStyle,
  panelShellStyle,
} from "./gptPanelStyles";
import {
  memorySettingsToInput,
  mergeUsage,
  normalizeLocalSettings,
  sumUsages,
} from "./gptPanelUtils";

const topEarRailStyle = (isMobile: boolean): React.CSSProperties => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "flex-start",
  gap: 4,
  paddingLeft: isMobile ? 8 : 12,
  paddingRight: isMobile ? 8 : 12,
  height: isMobile ? 24 : 18,
  marginTop: 0,
  marginBottom: isMobile ? -8 : -2,
  position: "relative",
  zIndex: 30,
  pointerEvents: "none",
});

const topEarTabStyle = (
  active: boolean,
  isMobile: boolean
): React.CSSProperties => ({
  height: isMobile ? 24 : 26,
  borderRadius: "0 0 9px 9px",
  border: "1px solid #cbd5e1",
  borderTop: "none",
  background: active ? "#ffffff" : "#f8fafc",
  color: active ? "#0f766e" : "#475569",
  fontSize: isMobile ? 11 : 12,
  fontWeight: 800,
  padding: isMobile ? "0 10px" : "0 12px",
  boxShadow: active ? "0 4px 10px rgba(15,23,42,0.10)" : "none",
  cursor: "pointer",
  pointerEvents: "auto",
  whiteSpace: "nowrap",
});

function formatContextUpdatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const contextLineWrapStyle = (isMobile: boolean): React.CSSProperties => ({
  marginLeft: isMobile ? 10 : 12,
  marginRight: isMobile ? 10 : 12,
  marginTop: isMobile ? 6 : 4,
  marginBottom: isMobile ? 6 : 6,
  minHeight: isMobile ? 18 : 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export default function GptPanel(props: GptPanelProps) {
  const {
    currentKinLabel,
    kinStatus,
    gptState,
    gptMessages,
    gptInput,
    setGptInput,
    sendToGpt,
    runPrepTaskFromInput,
    runDeepenTaskFromLast,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    resetGptForCurrentKin,
    sendLastGptToKinDraft,
    sendTaskToKinDraft,
    injectFileToKinDraft,
    canInjectFile,
    loading,
    ingestLoading,
    gptBottomRef,
    memorySettings,
    defaultMemorySettings,
    onSaveMemorySettings,
    onResetMemorySettings,
    tokenStats,
    responseMode,
    onChangeResponseMode,
    uploadKind,
    ingestMode,
    imageDetail,
    postIngestAction,
    fileReadPolicy,
    onChangeUploadKind,
    onChangeIngestMode,
    onChangeImageDetail,
    onChangePostIngestAction,
    onChangeFileReadPolicy,
    pendingInjectionCurrentPart,
    pendingInjectionTotalParts,
    onSwitchPanel,
    isMobile = false,
    currentTaskDraft,
    onChangeTaskTitle,
    onChangeTaskUserInstruction,
    onChangeTaskBody,
  } = props;

  const [activeDrawerTab, setActiveDrawerTab] =
    useState<GptTopDrawerTab>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showMemoryContent, setShowMemoryContent] = useState(false);
  const [activeBottomTab, setActiveBottomTab] =
    useState<GptBottomTab>("chat");
  const [localSettings, setLocalSettings] = useState<LocalMemorySettingsInput>(
    memorySettingsToInput(memorySettings)
  );

  useEffect(() => {
    setLocalSettings(memorySettingsToInput(memorySettings));
  }, [memorySettings]);

  const recent5Chat = useMemo(
    () => sumUsages(tokenStats.recentChatUsages),
    [tokenStats.recentChatUsages]
  );

  const totalUsage = useMemo(
    () => mergeUsage(tokenStats.threadChatTotal, tokenStats.threadSummaryTotal),
    [tokenStats.threadChatTotal, tokenStats.threadSummaryTotal]
  );

  const recentCount = gptState.recentMessages.length;
  const factCount = gptState.memory.facts.length;
  const preferenceCount = gptState.memory.preferences.length;

  const memoryCapacity =
    memorySettings.chatRecentLimit +
    memorySettings.maxFacts +
    memorySettings.maxPreferences;

  const memoryUsed = recentCount + factCount + preferenceCount;

  const memoryCapacityPreview =
    (Number(localSettings.chatRecentLimit) || 0) +
    (Number(localSettings.maxFacts) || 0) +
    (Number(localSettings.maxPreferences) || 0);

  const handleLocalFieldChange = (
    key: keyof LocalMemorySettingsInput,
    value: string
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value.replace(/[^0-9]/g, ""),
    }));
  };

  const handleSave = () => {
    const normalized = normalizeLocalSettings(localSettings);
    setLocalSettings(memorySettingsToInput(normalized));
    onSaveMemorySettings(normalized);
  };

  const handleReset = () => {
    setLocalSettings(memorySettingsToInput(defaultMemorySettings));
    onResetMemorySettings();
  };

  const handleDroppedFiles = async (files: FileList | null) => {
    const file = files?.[0];
    setDragOver(false);
    if (!file || isMobile || !canInjectFile || loading || ingestLoading) return;

    await injectFileToKinDraft(file, {
      kind: uploadKind,
      mode: ingestMode,
      detail: imageDetail,
      action: postIngestAction,
      readPolicy: fileReadPolicy,
    });
  };

  const handleChangeBottomTab = (tab: GptBottomTab) => {
    setActiveBottomTab(tab);
  };

  const transferHandler =
    activeBottomTab === "chat"
      ? sendLastGptToKinDraft
      : () => {
          void sendTaskToKinDraft();
        };

  const taskName =
    currentTaskDraft.title?.trim() ||
    currentTaskDraft.taskName?.trim() ||
    "";

  const currentTopic =
    gptState.memory.context.currentTopic?.trim() || "";

  const hasTask =
    !!currentTaskDraft.body.trim() ||
    !!currentTaskDraft.prepText.trim() ||
    !!currentTaskDraft.deepenText.trim() ||
    !!currentTaskDraft.mergedText.trim() ||
    currentTaskDraft.sources.length > 0;

  const taskFocused =
    activeDrawerTab === "task_status" ||
    activeBottomTab === "task_primary" ||
    activeBottomTab === "task_secondary";

  const contextKind: "task" | "chat" | null =
    taskFocused && taskName && hasTask
      ? "task"
      : currentTopic
        ? "chat"
        : taskName && hasTask
          ? "task"
          : null;

  const contextLabel =
    contextKind === "task"
      ? taskName
      : contextKind === "chat"
        ? currentTopic
        : "";

  const contextUpdatedAt =
    contextKind === "task"
      ? formatContextUpdatedAt(currentTaskDraft.updatedAt)
      : "";

  const showContextLine = !!contextLabel;

  return (
    <div
      style={{
        ...panelShellStyle(isMobile),
        height: "100%",
        minHeight: 0,
      }}
    >
      <GptHeader
        currentKinLabel={currentKinLabel}
        kinStatus={kinStatus}
        activeDrawerTab={activeDrawerTab}
        onToggleMemory={() =>
          setActiveDrawerTab((prev) => (prev === "memory" ? null : "memory"))
        }
        onToggleToken={() =>
          setActiveDrawerTab((prev) => (prev === "token" ? null : "token"))
        }
        onToggleSettings={() =>
          setActiveDrawerTab((prev) => (prev === "settings" ? null : "settings"))
        }
        isMobile={isMobile}
      />

      <div style={topEarRailStyle(isMobile)}>
        <button
          type="button"
          onClick={() =>
            setActiveDrawerTab((prev) => (prev === "memory" ? null : "memory"))
          }
          style={topEarTabStyle(activeDrawerTab === "memory", isMobile)}
        >
          メモリ
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveDrawerTab((prev) => (prev === "token" ? null : "token"))
          }
          style={topEarTabStyle(activeDrawerTab === "token", isMobile)}
        >
          トークン
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveDrawerTab((prev) =>
              prev === "task_status" ? null : "task_status"
            )
          }
          style={topEarTabStyle(activeDrawerTab === "task_status", isMobile)}
        >
          タスク状態
        </button>
      </div>

      {showContextLine && (
        <div style={contextLineWrapStyle(isMobile)}>
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: isMobile ? 13 : 13,
              fontWeight: 800,
              color: contextKind === "task" ? "#0f172a" : "#334155",
              textAlign: "left",
              lineHeight: 1.35,
            }}
            title={contextLabel}
          >
            {contextLabel}
          </div>

          <div
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              whiteSpace: "nowrap",
              lineHeight: 1.35,
            }}
          >
            {contextUpdatedAt ? `更新: ${contextUpdatedAt}` : ""}
          </div>
        </div>
      )}

      {activeDrawerTab && (
        <div
          style={{
            ...drawerWrapStyle(isMobile),
            marginTop: 0,
          }}
        >
          {activeDrawerTab === "settings" ? (
            <GptSettingsDrawer
              localSettings={localSettings}
              onFieldChange={handleLocalFieldChange}
              onReset={handleReset}
              onSave={handleSave}
              memoryCapacityPreview={memoryCapacityPreview}
              responseMode={responseMode}
              onChangeResponseMode={onChangeResponseMode}
              ingestMode={ingestMode}
              onChangeIngestMode={onChangeIngestMode}
              imageDetail={imageDetail}
              onChangeImageDetail={onChangeImageDetail}
              fileReadPolicy={fileReadPolicy}
              onChangeFileReadPolicy={onChangeFileReadPolicy}
              isMobile={isMobile}
            />
          ) : activeDrawerTab === "task_status" ? (
            <GptTaskStatusDrawer
              taskDraft={currentTaskDraft}
              onChangeTaskTitle={onChangeTaskTitle}
              onChangeTaskUserInstruction={onChangeTaskUserInstruction}
              onChangeTaskBody={onChangeTaskBody}
              isMobile={isMobile}
            />
          ) : (
            <GptMetaDrawer
              mode={activeDrawerTab}
              gptState={gptState}
              tokenStats={tokenStats}
              recent5Chat={recent5Chat}
              totalUsage={totalUsage}
              memoryUsed={memoryUsed}
              memoryCapacity={memoryCapacity}
              recentCount={recentCount}
              factCount={factCount}
              preferenceCount={preferenceCount}
              chatRecentLimit={memorySettings.chatRecentLimit}
              maxFacts={memorySettings.maxFacts}
              maxPreferences={memorySettings.maxPreferences}
              showMemoryContent={showMemoryContent}
              onToggleMemoryContent={() =>
                setShowMemoryContent((prev) => !prev)
              }
              isMobile={isMobile}
            />
          )}
        </div>
      )}

      <div
        style={{
          ...chatBodyStyle(isMobile),
          position: "relative",
          flex: 1,
          minHeight: 0,
        }}
        onDragOver={(event) => {
          if (isMobile || !canInjectFile) return;
          event.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (isMobile) return;
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }
          setDragOver(false);
        }}
        onDrop={(event) => {
          if (isMobile) return;
          event.preventDefault();
          void handleDroppedFiles(event.dataTransfer.files);
        }}
      >
        <ChatMessages messages={gptMessages} bottomRef={gptBottomRef} />

        {!isMobile && dragOver && (
          <div
            style={{
              position: "absolute",
              inset: 12,
              border: "2px dashed #10a37f",
              borderRadius: 18,
              background: "rgba(16,163,127,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#047857",
              pointerEvents: "none",
            }}
          >
            ファイルをドロップして注入
          </div>
        )}
      </div>

      <div
        style={{
          ...footerStyle(isMobile),
          position: "relative",
          overflow: "visible",
        }}
      >
        {pendingInjectionTotalParts > 0 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0f766e",
              background: "#ecfeff",
              border: "1px solid #a5f3fc",
              borderRadius: 10,
              padding: "8px 10px",
              marginBottom: 8,
            }}
          >
            📦 注入準備 {pendingInjectionCurrentPart}/{pendingInjectionTotalParts}
          </div>
        )}

        <GptToolbar
          activeTab={activeBottomTab}
          isMobile={isMobile}
          onSwitchPanel={onSwitchPanel}
          onChangeTab={handleChangeBottomTab}
          onAction={(mode) => sendToGpt(mode)}
          onRunTask={runPrepTaskFromInput}
          onRunDeepen={runDeepenTaskFromLast}
          onRunTaskUpdate={() => {
            void runUpdateTaskFromInput();
          }}
          onImportLastResponse={() => {
            void runUpdateTaskFromLastGptMessage();
          }}
          onAttachSearchResult={() => {
            void runAttachSearchResultToTask();
          }}
          onTransfer={transferHandler}
          onReset={resetGptForCurrentKin}
        />

        <GptComposer
          value={gptInput}
          onChange={setGptInput}
          onSubmit={() => sendToGpt("normal")}
          onInjectFile={injectFileToKinDraft}
          canInjectFile={canInjectFile}
          loading={loading}
          ingestLoading={ingestLoading}
          uploadKind={uploadKind}
          ingestMode={ingestMode}
          imageDetail={imageDetail}
          postIngestAction={postIngestAction}
          fileReadPolicy={fileReadPolicy}
          onChangeUploadKind={onChangeUploadKind}
          onChangeIngestMode={onChangeIngestMode}
          onChangeImageDetail={onChangeImageDetail}
          onChangePostIngestAction={onChangePostIngestAction}
          showFileTools={activeBottomTab === "file"}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}