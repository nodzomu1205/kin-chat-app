"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import DrawerTabs, { type DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import GptDrawerRouter from "@/components/panels/gpt/GptDrawerRouter";
import GptComposer from "@/components/panels/gpt/GptComposer";
import GptToolbar from "@/components/panels/gpt/GptToolbar";
import type {
  GptInstructionMode,
  GptPanelProps,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  getComposerPlaceholder,
  type BottomTabKey,
  type FloatingLabel,
  type LocalMemorySettingsInput,
  resolveFloatingLabel,
  toLocalSettings,
  toPositiveInt,
} from "@/components/panels/gpt/gptPanelHelpers";
import {
  chatBodyStyle,
  drawerWrapStyle,
  footerStyle,
  panelShellStyle,
  pillButton,
  statusDotStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import { formatUpdatedAt } from "@/components/panels/gpt/gptDrawerShared";
import { sumUsages } from "@/components/panels/gpt/gptPanelUtils";

export default function GptPanel(props: GptPanelProps) {
  const header = props.header ?? {
    currentKin: props.currentKin,
    currentKinLabel: props.currentKinLabel,
    kinStatus: props.kinStatus,
    isMobile: props.isMobile,
    onSwitchPanel: props.onSwitchPanel,
  };
  const chat = props.chat ?? {
    gptState: props.gptState,
    gptMessages: props.gptMessages,
    gptInput: props.gptInput,
    setGptInput: props.setGptInput,
    sendToGpt: props.sendToGpt,
    resetGptForCurrentKin: props.resetGptForCurrentKin,
    loading: props.loading,
    gptBottomRef: props.gptBottomRef,
  };
  const task = props.task ?? {
    currentTaskDraft: props.currentTaskDraft,
    taskProgressView: props.taskProgressView,
    pendingInjectionCurrentPart: props.pendingInjectionCurrentPart,
    pendingInjectionTotalParts: props.pendingInjectionTotalParts,
    runPrepTaskFromInput: props.runPrepTaskFromInput,
    runDeepenTaskFromLast: props.runDeepenTaskFromLast,
    runUpdateTaskFromInput: props.runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage: props.runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask: props.runAttachSearchResultToTask,
    sendLatestGptContentToKin: props.sendLatestGptContentToKin,
    sendCurrentTaskContentToKin: props.sendCurrentTaskContentToKin,
    receiveLastKinResponseToGptInput: props.receiveLastKinResponseToGptInput,
    sendLastGptToKinDraft: props.sendLastGptToKinDraft,
    onChangeTaskTitle: props.onChangeTaskTitle,
    onChangeTaskUserInstruction: props.onChangeTaskUserInstruction,
    onChangeTaskBody: props.onChangeTaskBody,
    onPrepareTaskRequestAck: props.onPrepareTaskRequestAck,
    onPrepareTaskSync: props.onPrepareTaskSync,
    onStartKinTask: props.onStartKinTask,
    onResetTaskContext: props.onResetTaskContext,
  };
  const settings = props.settings ?? {
    memorySettings: props.memorySettings,
    defaultMemorySettings: props.defaultMemorySettings,
    tokenStats: props.tokenStats,
    responseMode: props.responseMode,
    uploadKind: props.uploadKind,
    ingestMode: props.ingestMode,
    imageDetail: props.imageDetail,
    postIngestAction: props.postIngestAction,
    fileReadPolicy: props.fileReadPolicy,
    compactCharLimit: props.compactCharLimit,
    simpleImageCharLimit: props.simpleImageCharLimit,
    ingestLoading: props.ingestLoading,
    canInjectFile: props.canInjectFile,
    searchMode: props.searchMode,
    searchEngines: props.searchEngines,
    searchLocation: props.searchLocation,
    searchHistoryLimit: props.searchHistoryLimit,
    searchHistoryStorageMB: props.searchHistoryStorageMB,
    autoDocumentReferenceEnabled: props.autoDocumentReferenceEnabled,
    documentReferenceMode: props.documentReferenceMode,
    documentReferenceCount: props.documentReferenceCount,
    documentStorageMB: props.documentStorageMB,
    documentReferenceEstimatedTokens: props.documentReferenceEstimatedTokens,
    autoLibraryReferenceEnabled: props.autoLibraryReferenceEnabled,
    libraryReferenceMode: props.libraryReferenceMode,
    libraryIndexResponseCount: props.libraryIndexResponseCount,
    libraryReferenceCount: props.libraryReferenceCount,
    libraryStorageMB: props.libraryStorageMB,
    libraryReferenceEstimatedTokens: props.libraryReferenceEstimatedTokens,
    autoSendKinSysInput: props.autoSendKinSysInput,
    autoCopyKinSysResponseToGpt: props.autoCopyKinSysResponseToGpt,
    autoSendGptSysInput: props.autoSendGptSysInput,
    autoCopyGptSysResponseToKin: props.autoCopyGptSysResponseToKin,
    onSaveMemorySettings: props.onSaveMemorySettings,
    onResetMemorySettings: props.onResetMemorySettings,
    onChangeResponseMode: props.onChangeResponseMode,
    onChangeUploadKind: props.onChangeUploadKind,
    onChangeIngestMode: props.onChangeIngestMode,
    onChangeImageDetail: props.onChangeImageDetail,
    onChangeCompactCharLimit: props.onChangeCompactCharLimit,
    onChangeSimpleImageCharLimit: props.onChangeSimpleImageCharLimit,
    onChangePostIngestAction: props.onChangePostIngestAction,
    onChangeFileReadPolicy: props.onChangeFileReadPolicy,
    onChangeSearchMode: props.onChangeSearchMode,
    onChangeSearchEngines: props.onChangeSearchEngines,
    onChangeSearchLocation: props.onChangeSearchLocation,
    onChangeSearchHistoryLimit: props.onChangeSearchHistoryLimit,
    onClearSearchHistory: props.onClearSearchHistory,
    onChangeAutoDocumentReferenceEnabled: props.onChangeAutoDocumentReferenceEnabled,
    onChangeDocumentReferenceMode: props.onChangeDocumentReferenceMode,
    onChangeDocumentReferenceCount: props.onChangeDocumentReferenceCount,
    onChangeAutoLibraryReferenceEnabled: props.onChangeAutoLibraryReferenceEnabled,
    onChangeLibraryReferenceMode: props.onChangeLibraryReferenceMode,
    onChangeLibraryIndexResponseCount: props.onChangeLibraryIndexResponseCount,
    onChangeLibraryReferenceCount: props.onChangeLibraryReferenceCount,
    onChangeAutoSendKinSysInput: props.onChangeAutoSendKinSysInput,
    onChangeAutoCopyKinSysResponseToGpt: props.onChangeAutoCopyKinSysResponseToGpt,
    onChangeAutoSendGptSysInput: props.onChangeAutoSendGptSysInput,
    onChangeAutoCopyGptSysResponseToKin: props.onChangeAutoCopyGptSysResponseToKin,
  };

  const [activeDrawer, setActiveDrawer] = useState<DrawerMode>(null);
  const [bottomTab, setBottomTab] = useState<BottomTabKey>("chat");
  const [showMemoryContent, setShowMemoryContent] = useState(false);
  const [localSettings, setLocalSettings] = useState<LocalMemorySettingsInput>(() =>
    toLocalSettings({ ...props, memorySettings: settings.memorySettings, defaultMemorySettings: settings.defaultMemorySettings })
  );

  useEffect(() => {
    setLocalSettings(
      toLocalSettings({
        ...props,
        memorySettings: settings.memorySettings,
        defaultMemorySettings: settings.defaultMemorySettings,
      })
    );
  }, [settings.memorySettings, settings.defaultMemorySettings, header.currentKin]);

  const recentCount = chat.gptState.recentMessages?.length ?? 0;
  const factCount = chat.gptState.memory?.facts?.length ?? 0;
  const preferenceCount = chat.gptState.memory?.preferences?.length ?? 0;
  const listCount = Object.keys(chat.gptState.memory?.lists ?? {}).length;
  const memoryUsed = recentCount + factCount + preferenceCount;
  const memoryCapacity =
    (settings.memorySettings.chatRecentLimit ?? 0) +
    (settings.memorySettings.maxFacts ?? 0) +
    (settings.memorySettings.maxPreferences ?? 0);
  const latestUserText =
    [...chat.gptMessages]
      .reverse()
      .find((message) => message.role === "user")?.text || "";

  const floatingLabel = useMemo<FloatingLabel>(() => resolveFloatingLabel({
    activeDrawer,
    bottomTab,
    currentTaskDraft: task.currentTaskDraft,
    currentTaskFromMemory: chat.gptState.memory?.context?.currentTask,
    currentTopic: chat.gptState.memory?.context?.currentTopic,
    currentInput: chat.gptInput,
    latestUserText,
  }), [
    activeDrawer,
    bottomTab,
    task.currentTaskDraft,
    chat.gptState.memory?.context?.currentTask,
    chat.gptState.memory?.context?.currentTopic,
    chat.gptInput,
    latestUserText,
  ]);

  const memoryCapacityPreview =
    toPositiveInt(localSettings.chatRecentLimit, settings.memorySettings.chatRecentLimit ?? 0) +
    toPositiveInt(localSettings.maxFacts, settings.memorySettings.maxFacts ?? 0) +
    toPositiveInt(localSettings.maxPreferences, settings.memorySettings.maxPreferences ?? 0);

  const rolling5Usage = sumUsages(
    Array.isArray((settings.tokenStats as { recentChatUsages?: unknown }).recentChatUsages)
      ? (((settings.tokenStats as { recentChatUsages?: unknown }).recentChatUsages as Array<{
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
        }>) ?? [])
      : []
  );
  const totalUsage = {
    inputTokens: settings.tokenStats.cumulativeInput ?? 0,
    outputTokens: settings.tokenStats.cumulativeOutput ?? 0,
    totalTokens: settings.tokenStats.cumulativeTotal ?? 0,
  };

  const handleToolbarAction = (mode: GptInstructionMode) => {
    void chat.sendToGpt(mode);
  };

  return (
    <div
      style={{
        ...panelShellStyle(header.isMobile),
        height: "100%",
        minHeight: 0,
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 20,
          background: "#10a37f",
          color: "#fff",
          padding: header.isMobile ? "9px 12px" : "10px 14px",
          flexShrink: 0,
          minHeight: 46,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: header.isMobile ? 17 : 16,
              fontWeight: 800,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ChatGPT
          </div>

          <div
            style={{
              minWidth: 0,
              flexShrink: 1,
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={header.currentKinLabel || "Kin未選択"}
          >
            {header.currentKinLabel || "Kin未選択"}
          </div>

          <span style={statusDotStyle(header.kinStatus as "idle" | "connected" | "error")} aria-label={header.kinStatus} />

          <div style={{ flex: 1 }} />

          <button
            type="button"
            style={{
              ...pillButton,
              background:
                activeDrawer === "settings"
                  ? "rgba(255,255,255,0.22)"
                  : (pillButton.background as string),
            }}
            onClick={() => setActiveDrawer((prev) => (prev === "settings" ? null : "settings"))}
          >
            設定
          </button>
        </div>

        <DrawerTabs activeDrawer={activeDrawer} isMobile={header.isMobile} onChange={setActiveDrawer} />
      </div>

      {activeDrawer ? (
        <div style={drawerWrapStyle(header.isMobile)}>
          <GptDrawerRouter
            activeDrawer={activeDrawer}
            props={props}
            localSettings={localSettings}
            setLocalSettings={setLocalSettings}
            memoryUsed={memoryUsed}
            memoryCapacity={memoryCapacity}
            recentCount={recentCount}
            factCount={factCount}
            preferenceCount={preferenceCount}
            listCount={listCount}
            memoryCapacityPreview={memoryCapacityPreview}
            rolling5Usage={rolling5Usage}
            totalUsage={totalUsage}
            showMemoryContent={showMemoryContent}
            setShowMemoryContent={setShowMemoryContent}
            toPositiveInt={toPositiveInt}
          />
        </div>
      ) : null}

      <div
        style={{
          ...chatBodyStyle(header.isMobile),
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            minHeight: 30,
            padding: activeDrawer ? "18px 12px 8px 12px" : "22px 12px 10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 11,
            color: "#64748b",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflow: "hidden",
            }}
            title={floatingLabel.value || undefined}
          >
            {floatingLabel.value ? (
              <>
                <span
                  style={{
                    flexShrink: 0,
                    borderRadius: 999,
                    padding: "3px 8px",
                    fontSize: header.isMobile ? 10.5 : 11,
                    fontWeight: 800,
                    color: floatingLabel.accent,
                    background: floatingLabel.chipBg,
                    border: `1px solid ${floatingLabel.accent}22`,
                    lineHeight: 1.2,
                  }}
                >
                  {floatingLabel.kind}
                </span>
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 800,
                    color: "#111827",
                    fontSize: header.isMobile ? 12.5 : 14,
                  }}
                >
                  {floatingLabel.value}
                </span>
              </>
            ) : (
              ""
            )}
          </div>
          <div
            suppressHydrationWarning
            style={{ flexShrink: 0, whiteSpace: "nowrap", color: "#374151", fontSize: header.isMobile ? 11.5 : 12.5, fontWeight: 700 }}
          >
            {formatUpdatedAt(floatingLabel.updatedAt)}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ChatMessages
            messages={chat.gptMessages}
            bottomRef={chat.gptBottomRef}
            loadingText={chat.loading ? "ChatGPTが応答中…" : null}
          />
        </div>
      </div>

      <div style={footerStyle(header.isMobile)}>
        {task.pendingInjectionTotalParts > 0 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0f766e",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 10,
              padding: "8px 10px",
              marginBottom: 0,
            }}
          >
            注入送信中 {task.pendingInjectionCurrentPart}/{task.pendingInjectionTotalParts}
          </div>
        )}

        <div style={{ position: "relative", paddingTop: header.isMobile ? 0 : 0, marginTop: 0 }}>
          <GptToolbar
            activeTab={bottomTab}
            isMobile={header.isMobile}
            onSwitchPanel={header.onSwitchPanel}
            onChangeTab={setBottomTab}
            onAction={handleToolbarAction}
            onRunTask={() => void task.runPrepTaskFromInput()}
            onRunDeepen={() => void task.runDeepenTaskFromLast()}
            onRunTaskUpdate={() => void task.runUpdateTaskFromInput()}
            onImportLastResponse={() => void task.runUpdateTaskFromLastGptMessage()}
            onAttachSearchResult={() => void task.runAttachSearchResultToTask()}
            onSendLatestResponseToKin={() => void task.sendLatestGptContentToKin()}
            onSendCurrentTaskToKin={() => void task.sendCurrentTaskContentToKin()}
            onReceiveKinResponse={() => void task.receiveLastKinResponseToGptInput()}
            onTransfer={task.sendLastGptToKinDraft}
            onReset={chat.resetGptForCurrentKin}
          />
        </div>

        <GptComposer
          value={chat.gptInput}
          onChange={(value) => chat.setGptInput(value)}
          onSubmit={() => void chat.sendToGpt("normal")}
          submitOnEnter={!header.isMobile}
          placeholder={
            getComposerPlaceholder(bottomTab)
          }
          onInjectFile={props.injectFileToKinDraft}
          loading={chat.loading}
          ingestLoading={settings.ingestLoading}
          canInjectFile={settings.canInjectFile}
          uploadKind={settings.uploadKind}
          ingestMode={settings.ingestMode}
          imageDetail={settings.imageDetail}
          postIngestAction={settings.postIngestAction}
          fileReadPolicy={settings.fileReadPolicy}
          compactCharLimit={settings.compactCharLimit}
          simpleImageCharLimit={settings.simpleImageCharLimit}
          onChangeUploadKind={settings.onChangeUploadKind}
          onChangeIngestMode={settings.onChangeIngestMode}
          onChangeImageDetail={settings.onChangeImageDetail}
          onChangePostIngestAction={settings.onChangePostIngestAction}
          showFileTools={bottomTab === "file"}
          isMobile={header.isMobile}
        />
      </div>
    </div>
  );
}
