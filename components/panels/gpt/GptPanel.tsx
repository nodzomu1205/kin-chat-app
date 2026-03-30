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
    resetGptForCurrentKin,
    sendLastGptToKinDraft,
    loading,
    gptBottomRef,
    memorySettings,
    defaultMemorySettings,
    onSaveMemorySettings,
    onResetMemorySettings,
    tokenStats,
    onSwitchPanel,
    isMobile = false,
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
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

  return (
    <div style={panelShellStyle(isMobile)}>
      <GptHeader
        currentKinLabel={currentKinLabel}
        kinStatus={kinStatus}
        memoryUsed={memoryUsed}
        memoryCapacity={memoryCapacity}
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

      <div style={chatBodyStyle(isMobile)}>
        <ChatMessages messages={gptMessages} bottomRef={gptBottomRef} />
      </div>

      <div style={footerStyle(isMobile)}>
        <GptToolbar
          isMobile={isMobile}
          onSwitchPanel={onSwitchPanel}
          onAction={(mode) => sendToGpt(mode)}
          onTransfer={sendLastGptToKinDraft}
          onReset={resetGptForCurrentKin}
        />

        <GptComposer
          value={gptInput}
          onChange={setGptInput}
          onSubmit={() => sendToGpt("normal")}
          loading={loading}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
