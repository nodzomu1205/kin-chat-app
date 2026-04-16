"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import DrawerTabs, { type DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import GptDrawerRouter from "@/components/panels/gpt/GptDrawerRouter";
import GptComposer from "@/components/panels/gpt/GptComposer";
import GptSettingsWorkspace, {
  type SettingsWorkspaceView,
} from "@/components/panels/gpt/GptSettingsWorkspace";
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
  statusDotStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import { formatUpdatedAt } from "@/components/panels/gpt/gptDrawerShared";
import { sumUsages } from "@/components/panels/gpt/gptPanelUtils";

function headerIconButtonStyle(params: {
  active: boolean;
  hasPending: boolean;
}): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: params.active
      ? "1px solid rgba(255,255,255,0.72)"
      : "1px solid rgba(255,255,255,0.35)",
    background: params.active
      ? "rgba(255,255,255,0.24)"
      : "rgba(255,255,255,0.12)",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    position: "relative",
    boxShadow: params.hasPending
      ? "0 0 0 2px rgba(250,204,21,0.22), 0 0 16px rgba(250,204,21,0.55)"
      : params.active
        ? "0 8px 18px rgba(15,23,42,0.18)"
        : "none",
  };
}

function HeaderIconButton(props: {
  label: string;
  active: boolean;
  hasPending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      style={headerIconButtonStyle({
        active: props.active,
        hasPending: props.hasPending,
      })}
      onClick={props.onClick}
    >
      {props.children}
      {props.hasPending ? (
        <span
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#facc15",
            boxShadow: "0 0 10px rgba(250,204,21,0.9)",
          }}
        />
      ) : null}
    </button>
  );
}

function ChatSettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5C5 5.12 6.12 4 7.5 4h9C17.88 4 19 5.12 19 6.5v6C19 13.88 17.88 15 16.5 15H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 12.5v-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9.5" r="1" fill="currentColor" />
      <circle cx="12" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

function TaskSettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4.75h6a1.5 1.5 0 0 1 1.5 1.5v.75h1.25A1.75 1.75 0 0 1 19.5 8.75v9.5A1.75 1.75 0 0 1 17.75 20h-11A1.75 1.75 0 0 1 5 18.25v-9.5A1.75 1.75 0 0 1 6.75 7h1.25v-.75A1.5 1.5 0 0 1 9.5 4.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 10h6M9 13.5h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LibrarySettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 6.25A2.25 2.25 0 0 1 7.75 4h5.5A2.25 2.25 0 0 1 15.5 6.25V18a2 2 0 0 0-2-2h-6A2 2 0 0 0 5.5 18V6.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 9.5h1a3 3 0 1 1-1.54 5.58"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="12.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18.7 13.7 20 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function GptPanel(props: GptPanelProps) {
  const { header, chat, task, protocol, references, settings } = props;

  const [activeDrawer, setActiveDrawer] = useState<DrawerMode>(null);
  const [activeSettingsWorkspace, setActiveSettingsWorkspace] =
    useState<SettingsWorkspaceView | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTabKey>("chat");
  const [showMemoryContent, setShowMemoryContent] = useState(false);
  const [localSettings, setLocalSettings] = useState<LocalMemorySettingsInput>(() =>
    toLocalSettings(settings)
  );

  useEffect(() => {
    setLocalSettings(toLocalSettings(settings));
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
  const floatingLabel = useMemo<FloatingLabel>(() => resolveFloatingLabel({
    activeDrawer,
    bottomTab,
    currentTaskDraft: task.currentTaskDraft,
    currentTopic: chat.gptState.memory?.context?.currentTopic,
  }), [
    activeDrawer,
    bottomTab,
    task.currentTaskDraft,
    chat.gptState.memory?.context?.currentTopic,
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
  const hasPendingMemoryApprovals =
    settings.pendingMemoryRuleCandidates.length > 0;
  const hasPendingSysApprovals = protocol.pendingIntentCandidates.length > 0;

  const handleToolbarAction = (mode: GptInstructionMode) => {
    void chat.sendToGpt(mode);
  };

  const handleDrawerChange = (next: DrawerMode) => {
    setActiveSettingsWorkspace(null);
    setActiveDrawer(next);
  };

  const toggleSettingsWorkspace = (next: SettingsWorkspaceView) => {
    setActiveDrawer(null);
    setActiveSettingsWorkspace((prev) => (prev === next ? null : next));
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

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <HeaderIconButton
              label="チャット設定"
              active={activeSettingsWorkspace === "chat"}
              hasPending={hasPendingMemoryApprovals}
              onClick={() => toggleSettingsWorkspace("chat")}
            >
              <ChatSettingsIcon />
            </HeaderIconButton>
            <HeaderIconButton
              label="タスク設定"
              active={activeSettingsWorkspace === "task"}
              hasPending={hasPendingSysApprovals}
              onClick={() => toggleSettingsWorkspace("task")}
            >
              <TaskSettingsIcon />
            </HeaderIconButton>
            <HeaderIconButton
              label="ライブラリ設定"
              active={activeSettingsWorkspace === "library"}
              hasPending={false}
              onClick={() => toggleSettingsWorkspace("library")}
            >
              <LibrarySettingsIcon />
            </HeaderIconButton>
          </div>
        </div>

        <DrawerTabs
          activeDrawer={activeDrawer}
          isMobile={header.isMobile}
          onChange={handleDrawerChange}
        />
      </div>

      {activeDrawer && !activeSettingsWorkspace ? (
        <div style={drawerWrapStyle(header.isMobile)}>
          <GptDrawerRouter
            activeDrawer={activeDrawer}
            header={header}
            chat={chat}
            task={task}
            protocol={protocol}
            references={references}
            settings={settings}
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
          display: activeSettingsWorkspace ? "none" : "flex",
          flex: 1,
          minHeight: 0,
          flexDirection: "column",
        }}
      >
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
            sourceDisplayCount={settings.sourceDisplayCount}
            onImportYouTubeTranscript={references.onImportYouTubeTranscript}
            onSendYouTubeTranscriptToKin={references.onSendYouTubeTranscriptToKin}
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
            onInjectFile={chat.onInjectFile}
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

      <div
        style={{
          display: activeSettingsWorkspace ? "flex" : "none",
          flex: activeSettingsWorkspace ? 1 : undefined,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {activeSettingsWorkspace ? (
          <GptSettingsWorkspace
            activeView={activeSettingsWorkspace}
            settings={settings}
            protocol={protocol}
            localSettings={localSettings}
            setLocalSettings={setLocalSettings}
            memoryCapacityPreview={memoryCapacityPreview}
            toPositiveInt={toPositiveInt}
            isMobile={header.isMobile}
            onClose={() => setActiveSettingsWorkspace(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
