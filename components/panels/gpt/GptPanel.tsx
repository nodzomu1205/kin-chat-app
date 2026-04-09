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
  const [activeDrawer, setActiveDrawer] = useState<DrawerMode>(null);
  const [bottomTab, setBottomTab] = useState<BottomTabKey>("chat");
  const [showMemoryContent, setShowMemoryContent] = useState(false);
  const [localSettings, setLocalSettings] = useState<LocalMemorySettingsInput>(() =>
    toLocalSettings(props)
  );

  useEffect(() => {
    setLocalSettings(toLocalSettings(props));
  }, [props.memorySettings, props.defaultMemorySettings, props.currentKin]);

  const recentCount = props.gptState.recentMessages?.length ?? 0;
  const factCount = props.gptState.memory?.facts?.length ?? 0;
  const preferenceCount = props.gptState.memory?.preferences?.length ?? 0;
  const memoryUsed = recentCount + factCount + preferenceCount;
  const memoryCapacity =
    (props.memorySettings.chatRecentLimit ?? 0) +
    (props.memorySettings.maxFacts ?? 0) +
    (props.memorySettings.maxPreferences ?? 0);

  const floatingLabel = useMemo<FloatingLabel>(() => resolveFloatingLabel({
    activeDrawer,
    bottomTab,
    currentTaskDraft: props.currentTaskDraft,
    currentTaskFromMemory: props.gptState.memory?.context?.currentTask,
    currentTopic: props.gptState.memory?.context?.currentTopic,
  }), [
    activeDrawer,
    bottomTab,
    props.currentTaskDraft,
    props.gptState.memory?.context?.currentTask,
    props.gptState.memory?.context?.currentTopic,
  ]);

  const memoryCapacityPreview =
    toPositiveInt(localSettings.chatRecentLimit, props.memorySettings.chatRecentLimit ?? 0) +
    toPositiveInt(localSettings.maxFacts, props.memorySettings.maxFacts ?? 0) +
    toPositiveInt(localSettings.maxPreferences, props.memorySettings.maxPreferences ?? 0);

  const rolling5Usage = sumUsages(
    Array.isArray((props.tokenStats as { recentChatUsages?: unknown }).recentChatUsages)
      ? (((props.tokenStats as { recentChatUsages?: unknown }).recentChatUsages as Array<{
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
        }>) ?? [])
      : []
  );
  const totalUsage = {
    inputTokens: props.tokenStats.cumulativeInput ?? 0,
    outputTokens: props.tokenStats.cumulativeOutput ?? 0,
    totalTokens: props.tokenStats.cumulativeTotal ?? 0,
  };

  const handleToolbarAction = (mode: GptInstructionMode) => {
    void props.sendToGpt(mode);
  };

  return (
    <div
      style={{
        ...panelShellStyle(props.isMobile),
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
          padding: props.isMobile ? "9px 12px" : "10px 14px",
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
              fontSize: props.isMobile ? 17 : 16,
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
            title={props.currentKinLabel || "Kin未選択"}
          >
            {props.currentKinLabel || "Kin未選択"}
          </div>

          <span style={statusDotStyle(props.kinStatus as "idle" | "connected" | "error")} aria-label={props.kinStatus} />

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

        <DrawerTabs activeDrawer={activeDrawer} isMobile={props.isMobile} onChange={setActiveDrawer} />
      </div>

      {activeDrawer ? (
        <div style={drawerWrapStyle(props.isMobile)}>
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
          ...chatBodyStyle(props.isMobile),
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
                    fontSize: props.isMobile ? 10.5 : 11,
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
                    fontSize: props.isMobile ? 12.5 : 14,
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
            style={{ flexShrink: 0, whiteSpace: "nowrap", color: "#374151", fontSize: props.isMobile ? 11.5 : 12.5, fontWeight: 700 }}
          >
            {formatUpdatedAt(floatingLabel.updatedAt)}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ChatMessages
            messages={props.gptMessages}
            bottomRef={props.gptBottomRef}
            loadingText={props.loading ? "ChatGPTが応答中…" : null}
          />
        </div>
      </div>

      <div style={footerStyle(props.isMobile)}>
        {props.pendingInjectionTotalParts > 0 && (
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
            注入送信中 {props.pendingInjectionCurrentPart}/{props.pendingInjectionTotalParts}
          </div>
        )}

        <div style={{ position: "relative", paddingTop: props.isMobile ? 0 : 0, marginTop: 0 }}>
          <GptToolbar
            activeTab={bottomTab}
            isMobile={props.isMobile}
            onSwitchPanel={props.onSwitchPanel}
            onChangeTab={setBottomTab}
            onAction={handleToolbarAction}
            onRunTask={() => void props.runPrepTaskFromInput()}
            onRunDeepen={() => void props.runDeepenTaskFromLast()}
            onRunTaskUpdate={() => void props.runUpdateTaskFromInput()}
            onImportLastResponse={() => void props.runUpdateTaskFromLastGptMessage()}
            onAttachSearchResult={() => void props.runAttachSearchResultToTask()}
            onSendLatestResponseToKin={() => void props.sendLatestGptContentToKin()}
            onSendCurrentTaskToKin={() => void props.sendCurrentTaskContentToKin()}
            onReceiveKinResponse={() => void props.receiveLastKinResponseToGptInput()}
            onTransfer={props.sendLastGptToKinDraft}
            onReset={props.resetGptForCurrentKin}
          />
        </div>

        <GptComposer
          value={props.gptInput}
          onChange={(value) => props.setGptInput(value)}
          onSubmit={() => void props.sendToGpt("normal")}
          submitOnEnter={!props.isMobile}
          placeholder={
            getComposerPlaceholder(bottomTab)
          }
          onInjectFile={props.injectFileToKinDraft}
          loading={props.loading}
          ingestLoading={props.ingestLoading}
          canInjectFile={props.canInjectFile}
          uploadKind={props.uploadKind}
          ingestMode={props.ingestMode}
          imageDetail={props.imageDetail}
          postIngestAction={props.postIngestAction}
          fileReadPolicy={props.fileReadPolicy}
          compactCharLimit={props.compactCharLimit}
          simpleImageCharLimit={props.simpleImageCharLimit}
          onChangeUploadKind={props.onChangeUploadKind}
          onChangeIngestMode={props.onChangeIngestMode}
          onChangeImageDetail={props.onChangeImageDetail}
          onChangePostIngestAction={props.onChangePostIngestAction}
          showFileTools={bottomTab === "file"}
          isMobile={props.isMobile}
        />
      </div>
    </div>
  );
}
