"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import GptComposer from "@/components/panels/gpt/GptComposer";
import GptMetaDrawer from "@/components/panels/gpt/GptMetaDrawer";
import GptSettingsDrawer from "@/components/panels/gpt/GptSettingsDrawer";
import GptTaskStatusDrawer from "@/components/panels/gpt/GptTaskStatusDrawer";
import GptToolbar from "@/components/panels/gpt/GptToolbar";
import type {
  GptInstructionMode,
  GptPanelProps,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  chatBodyStyle,
  drawerWrapStyle,
  footerStyle,
  panelShellStyle,
  pillButton,
  statusDotStyle,
} from "@/components/panels/gpt/gptPanelStyles";


type TopTabKey = "memory" | "tokens" | "task_draft" | "task_progress";
type DrawerMode = TopTabKey | "settings" | null;
type BottomTabKey = "chat" | "task_primary" | "task_secondary" | "kin" | "file";

type LocalMemorySettingsInput = {
  maxFacts: string;
  maxPreferences: string;
  chatRecentLimit: string;
  summarizeThreshold: string;
  recentKeep: string;
};

function toLocalSettings(props: GptPanelProps): LocalMemorySettingsInput {
  return {
    maxFacts: String(props.memorySettings.maxFacts ?? props.defaultMemorySettings.maxFacts ?? 0),
    maxPreferences: String(
      props.memorySettings.maxPreferences ?? props.defaultMemorySettings.maxPreferences ?? 0
    ),
    chatRecentLimit: String(
      props.memorySettings.chatRecentLimit ?? props.defaultMemorySettings.chatRecentLimit ?? 0
    ),
    summarizeThreshold: String(
      props.memorySettings.summarizeThreshold ?? props.defaultMemorySettings.summarizeThreshold ?? 0
    ),
    recentKeep: String(props.memorySettings.recentKeep ?? props.defaultMemorySettings.recentKeep ?? 0),
  };
}

function toPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function formatUpdatedAt(value: string) {
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

function countText(
  completedCount?: number,
  targetCount?: number,
  status?: string
) {
  if (typeof completedCount === "number" && typeof targetCount === "number") {
    return `${completedCount}/${targetCount}`;
  }
  return status || "-";
}

function topTabStyle(active: boolean, isMobile: boolean): React.CSSProperties {
  return {
    height: isMobile ? 24 : 28,
    borderRadius: "0 0 9px 9px",
    border: "1px solid #cbd5e1",
    borderTop: active ? "none" : "1px solid #cbd5e1",
    background: active ? "#ffffff" : "#f8fafc",
    color: active ? "#0f766e" : "#475569",
    fontSize: isMobile ? 11 : 12,
    fontWeight: 800,
    padding: isMobile ? "0 7px" : "0 10px",
    boxShadow: active ? "0 4px 10px rgba(15,23,42,0.08)" : "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

function DrawerTabs({
  activeDrawer,
  isMobile,
  onChange,
}: {
  activeDrawer: DrawerMode;
  isMobile: boolean;
  onChange: (next: DrawerMode) => void;
}) {
  const toggle = (key: TopTabKey) => onChange(activeDrawer === key ? null : key);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 0,
          borderTop: "1px solid rgba(255,255,255,0.36)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 10,
          bottom: 0,
          transform: "translateY(calc(100% - 1px))",
          zIndex: 30,
          display: "flex",
          alignItems: "flex-start",
          gap: 3,
          maxWidth: "calc(100% - 24px)",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
      <button type="button" onClick={() => toggle("memory")} style={topTabStyle(activeDrawer === "memory", isMobile)}>
        メモリ
      </button>
      <button type="button" onClick={() => toggle("tokens")} style={topTabStyle(activeDrawer === "tokens", isMobile)}>
        トークン
      </button>
      <button type="button" onClick={() => toggle("task_draft")} style={topTabStyle(activeDrawer === "task_draft", isMobile)}>
        タスク整理
      </button>
      <button type="button" onClick={() => toggle("task_progress")} style={topTabStyle(activeDrawer === "task_progress", isMobile)}>
        タスク進捗
      </button>
      </div>
    </>
  );
}

function TaskProgressPanel({
  taskProgressView,
  onAnswerTaskRequest,
}: Pick<GptPanelProps, "taskProgressView" | "onAnswerTaskRequest">) {
  if (!taskProgressView) {
    return (
      <div
        style={{
          border: "1px solid #dbe4e8",
          borderRadius: 18,
          background: "rgba(255,255,255,0.92)",
          padding: 16,
          fontSize: 13,
          color: "#64748b",
        }}
      >
        まだ進行中のKinタスクはありません。
      </div>
    );
  }

  const requiredItems = taskProgressView.requirementProgress.filter(
    (x) => x.category === "required"
  );
  const optionalItems = taskProgressView.requirementProgress.filter(
    (x) => x.category === "optional"
  );

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #dbe4e8",
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    padding: 14,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionStyle}>
        <div style={{ fontSize: 12, color: "#64748b" }}>現在タスク</div>
        <div style={{ marginTop: 4, fontWeight: 700, color: "#0f172a" }}>
          {taskProgressView.taskId ? `#${taskProgressView.taskId} ` : ""}
          {taskProgressView.taskTitle || "未設定"}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>ゴール</div>
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.65 }}>
          {taskProgressView.goal || "-"}
        </div>
      </section>

      {[{ title: "必須要件", items: requiredItems }, { title: "可能要件", items: optionalItems }].map(
        (group) => (
          <section key={group.title} style={sectionStyle}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{group.title}</div>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {group.items.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 13 }}>なし</div>
              ) : (
                group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      border: "1px solid #eef2f7",
                      borderRadius: 14,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ color: "#334155", lineHeight: 1.55 }}>{item.label}</div>
                    <div style={{ flexShrink: 0, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                      {countText(item.completedCount, item.targetCount, item.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )
      )}

      <section style={sectionStyle}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>ユーザーへの依頼</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {taskProgressView.userFacingRequests.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>現在はありません。</div>
          ) : (
            taskProgressView.userFacingRequests.map((req) => (
              <div
                key={req.requestId}
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#334155" }}>
                    [{req.requestId}] {req.kind === "question" ? "確認" : "資料要求"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{req.status}</div>
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6 }}>
                  {req.body}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#64748b" }}>
                  <span>{req.required ? "必須" : "任意"}</span>
                  {onAnswerTaskRequest ? (
                    <button
                      type="button"
                      onClick={() => onAnswerTaskRequest(req.requestId)}
                      style={{
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        borderRadius: 8,
                        padding: "5px 8px",
                        cursor: "pointer",
                        color: "#334155",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      この依頼に回答
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

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

  const floatingLabel = useMemo(() => {
    const taskName = props.currentTaskDraft.title?.trim() || props.currentTaskDraft.taskName?.trim() || props.gptState.memory?.context?.currentTask?.trim() || "";
    const topic = props.gptState.memory?.context?.currentTopic?.trim() || "";
    const taskFocused =
      bottomTab === "task_primary" ||
      bottomTab === "task_secondary" ||
      activeDrawer === "task_draft" ||
      activeDrawer === "task_progress";

    if (taskFocused && taskName) {
      return { kind: "タスク", value: taskName, updatedAt: props.currentTaskDraft.updatedAt || "" };
    }

    if (bottomTab === "chat" && topic) {
      return { kind: "トピック", value: topic, updatedAt: "" };
    }

    if (topic) {
      return { kind: "トピック", value: topic, updatedAt: "" };
    }

    if (taskName) {
      return { kind: "タスク", value: taskName, updatedAt: props.currentTaskDraft.updatedAt || "" };
    }

    return { kind: "", value: "", updatedAt: "" };
  }, [
    activeDrawer,
    bottomTab,
    props.currentTaskDraft.taskName,
    props.currentTaskDraft.title,
    props.currentTaskDraft.updatedAt,
    props.gptState.memory?.context?.currentTopic,
    props.gptState.memory?.context?.currentTask,
  ]);

  const memoryCapacityPreview =
    toPositiveInt(localSettings.chatRecentLimit, props.memorySettings.chatRecentLimit ?? 0) +
    toPositiveInt(localSettings.maxFacts, props.memorySettings.maxFacts ?? 0) +
    toPositiveInt(localSettings.maxPreferences, props.memorySettings.maxPreferences ?? 0);

  const latestUsage = {
    inputTokens: props.tokenStats.latestInput ?? 0,
    outputTokens: props.tokenStats.latestOutput ?? 0,
    totalTokens: props.tokenStats.latestTotal ?? 0,
  };
  const rolling5Usage = {
    inputTokens: props.tokenStats.rolling5Input ?? 0,
    outputTokens: props.tokenStats.rolling5Output ?? 0,
    totalTokens: props.tokenStats.rolling5Total ?? 0,
  };
  const totalUsage = {
    inputTokens: props.tokenStats.cumulativeInput ?? 0,
    outputTokens: props.tokenStats.cumulativeOutput ?? 0,
    totalTokens: props.tokenStats.cumulativeTotal ?? 0,
  };

  const renderDrawerContent = () => {
    if (activeDrawer === "memory") {
      return (
        <GptMetaDrawer
          mode="memory"
          gptState={props.gptState as never}
          tokenStats={props.tokenStats as never}
          recent5Chat={rolling5Usage}
          totalUsage={totalUsage}
          memoryUsed={memoryUsed}
          memoryCapacity={memoryCapacity}
          recentCount={recentCount}
          factCount={factCount}
          preferenceCount={preferenceCount}
          chatRecentLimit={props.memorySettings.chatRecentLimit}
          maxFacts={props.memorySettings.maxFacts}
          maxPreferences={props.memorySettings.maxPreferences}
          showMemoryContent={showMemoryContent}
          onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
          isMobile={props.isMobile}
        />
      );
    }

    if (activeDrawer === "tokens") {
      return (
        <GptMetaDrawer
          mode="tokens"
          gptState={props.gptState as never}
          tokenStats={props.tokenStats as never}
          recent5Chat={rolling5Usage}
          totalUsage={totalUsage}
          memoryUsed={memoryUsed}
          memoryCapacity={memoryCapacity}
          recentCount={recentCount}
          factCount={factCount}
          preferenceCount={preferenceCount}
          chatRecentLimit={props.memorySettings.chatRecentLimit}
          maxFacts={props.memorySettings.maxFacts}
          maxPreferences={props.memorySettings.maxPreferences}
          showMemoryContent={showMemoryContent}
          onToggleMemoryContent={() => setShowMemoryContent((prev) => !prev)}
          isMobile={props.isMobile}
        />
      );
    }

    if (activeDrawer === "task_draft") {
      return (
        <GptTaskStatusDrawer
          taskDraft={props.currentTaskDraft}
          onChangeTaskTitle={props.onChangeTaskTitle}
          onChangeTaskUserInstruction={props.onChangeTaskUserInstruction}
          onChangeTaskBody={props.onChangeTaskBody}
          isMobile={props.isMobile}
        />
      );
    }

    if (activeDrawer === "task_progress") {
      return (
        <TaskProgressPanel
          taskProgressView={props.taskProgressView}
          onAnswerTaskRequest={props.onAnswerTaskRequest}
        />
      );
    }

    if (activeDrawer === "settings") {
      return (
        <GptSettingsDrawer
          localSettings={localSettings}
          onFieldChange={(key, value) =>
            setLocalSettings((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
          onReset={() => {
            props.onResetMemorySettings();
            setLocalSettings({
              maxFacts: String(props.defaultMemorySettings.maxFacts ?? 0),
              maxPreferences: String(props.defaultMemorySettings.maxPreferences ?? 0),
              chatRecentLimit: String(props.defaultMemorySettings.chatRecentLimit ?? 0),
              summarizeThreshold: String(props.defaultMemorySettings.summarizeThreshold ?? 0),
              recentKeep: String(props.defaultMemorySettings.recentKeep ?? 0),
            });
          }}
          onSave={() => {
            props.onSaveMemorySettings({
              maxFacts: toPositiveInt(localSettings.maxFacts, props.memorySettings.maxFacts ?? 0),
              maxPreferences: toPositiveInt(
                localSettings.maxPreferences,
                props.memorySettings.maxPreferences ?? 0
              ),
              chatRecentLimit: toPositiveInt(
                localSettings.chatRecentLimit,
                props.memorySettings.chatRecentLimit ?? 0
              ),
              summarizeThreshold: toPositiveInt(
                localSettings.summarizeThreshold,
                props.memorySettings.summarizeThreshold ?? 0
              ),
              recentKeep: toPositiveInt(localSettings.recentKeep, props.memorySettings.recentKeep ?? 0),
            });
          }}
          memoryCapacityPreview={memoryCapacityPreview}
          responseMode={props.responseMode}
          onChangeResponseMode={props.onChangeResponseMode}
          ingestMode={props.ingestMode}
          onChangeIngestMode={props.onChangeIngestMode}
          imageDetail={props.imageDetail}
          onChangeImageDetail={props.onChangeImageDetail}
          compactCharLimit={props.compactCharLimit}
          simpleImageCharLimit={props.simpleImageCharLimit}
          onChangeCompactCharLimit={props.onChangeCompactCharLimit}
          onChangeSimpleImageCharLimit={props.onChangeSimpleImageCharLimit}
          fileReadPolicy={props.fileReadPolicy}
          onChangeFileReadPolicy={props.onChangeFileReadPolicy}
          isMobile={props.isMobile}
        />
      );
    }

    return null;
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
          {renderDrawerContent()}
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
            padding: activeDrawer ? "18px 12px 0 12px" : "22px 12px 0 12px",
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
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 800,
              color: "#111827",
              fontSize: props.isMobile ? 12.5 : 14,
            }}
            title={floatingLabel.value || undefined}
          >
            {floatingLabel.value ? `${floatingLabel.kind}: ${floatingLabel.value}` : ""}
          </div>
          <div style={{ flexShrink: 0, whiteSpace: "nowrap", color: "#374151", fontSize: props.isMobile ? 11.5 : 12.5, fontWeight: 700 }}>
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
            📦 注入送信中 {props.pendingInjectionCurrentPart}/{props.pendingInjectionTotalParts}
          </div>
        )}

        <div style={{ position: "relative", paddingTop: props.isMobile ? 14 : 16, marginTop: 0 }}>
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
            onTransfer={() => void props.sendLatestGptContentToKin()}
            onReset={props.resetGptForCurrentKin}
          />
        </div>

        <GptComposer
          value={props.gptInput}
          onChange={(value) => props.setGptInput(value)}
          onSubmit={() => void props.sendToGpt("normal")}
          submitOnEnter={!props.isMobile}
          placeholder={
            bottomTab === "chat"
              ? "メッセージを入力"
              : bottomTab === "task_primary"
                ? "送信以外のボタン使用時は、新規又は更新タスク内容を入力"
                : bottomTab === "task_secondary"
                  ? "送信以外のボタン使用時は、タスク整理に関する指示や方向性を入力"
                  : bottomTab === "kin"
                    ? "送信以外のボタン使用時は、Kinへの指示内容や条件を入力"
                    : "注入ボタン使用時は、ファイル取込時の指示を入力"
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
