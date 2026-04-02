"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import type { GptPanelProps, LocalMemorySettingsInput } from "./gptPanelTypes";
import GptHeader from "./GptHeader";
import GptMetaDrawer from "./GptMetaDrawer";
import GptSettingsDrawer from "./GptSettingsDrawer";
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
    resetGptForCurrentKin,
    sendLastGptToKinDraft,
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
    onChangeUploadKind,
    onChangeIngestMode,
    onChangeImageDetail,
    onChangePostIngestAction,
    pendingInjectionCurrentPart,
    pendingInjectionTotalParts,
    onSwitchPanel,
    isMobile = false,
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showInjectTools, setShowInjectTools] = useState(false);
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
    });
  };

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
        memoryUsed={memoryUsed}
        memoryCapacity={memoryCapacity}
        responseMode={responseMode}
        showMeta={showMeta}
        showSettings={showSettings}
        onToggleMeta={() => {
          if (showMeta) {
            setShowMeta(false);
          } else {
            setShowMeta(true);
            setShowSettings(false);
          }
        }}
        onToggleSettings={() => {
          if (showSettings) {
            setShowSettings(false);
          } else {
            setShowSettings(true);
            setShowMeta(false);
          }
        }}
        onToggleResponseMode={() =>
          onChangeResponseMode(responseMode === "strict" ? "creative" : "strict")
        }
        isMobile={isMobile}
      />

      {(showMeta || showSettings) && (
        <div style={drawerWrapStyle(isMobile)}>
          {showMeta ? (
            <GptMetaDrawer
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
              isMobile={isMobile}
            />
          ) : (
            <GptSettingsDrawer
              localSettings={localSettings}
              onFieldChange={handleLocalFieldChange}
              onReset={handleReset}
              onSave={handleSave}
              memoryCapacityPreview={memoryCapacityPreview}
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
          handleDroppedFiles(event.dataTransfer.files);
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
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 0,
            transform: "translateY(-100%)",
            zIndex: 40,
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setShowInjectTools((prev) => !prev)}
            style={{
              height: 34,
              borderRadius: "10px 10px 0 0",
              border: "1px solid #cbd5e1",
              borderBottom: showInjectTools ? "none" : "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f766e",
              fontSize: 12,
              fontWeight: 800,
              padding: "0 12px",
              boxShadow: "0 -2px 8px rgba(15,23,42,0.10)",
              cursor: "pointer",
            }}
          >
            {showInjectTools ? "注入 ▲" : "注入 ▼"}
          </button>
        </div>

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
          isMobile={isMobile}
          onSwitchPanel={onSwitchPanel}
          onAction={(mode) => sendToGpt(mode)}
          onRunTask={runPrepTaskFromInput}
          onRunDeepen={runDeepenTaskFromLast}
          onTransfer={sendLastGptToKinDraft}
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
          onChangeUploadKind={onChangeUploadKind}
          onChangeIngestMode={onChangeIngestMode}
          onChangeImageDetail={onChangeImageDetail}
          onChangePostIngestAction={onChangePostIngestAction}
          showInjectTools={showInjectTools}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}