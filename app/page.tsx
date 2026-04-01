"use client";

import { useEffect, useRef, useState } from "react";
import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory } from "@/hooks/useGptMemory";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { createSession, getSessions } from "@/lib/storage";
import type { MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";
import { generateId } from "@/lib/uuid";
import {
  type TokenStats,
  emptyTokenStats,
  normalizeUsage,
} from "@/lib/tokenStats";
import type { ResponseMode } from "@/components/panels/gpt/gptPanelTypes";

type GptInstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 900;
const RESPONSE_MODE_KEY = "gpt_response_mode";

export default function ChatApp() {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [kinLoading, setKinLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [, setCurrentSessionId] = useState<string | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats>(emptyTokenStats());
  const [responseMode, setResponseMode] = useState<ResponseMode>("strict");

  const [activeTab, setActiveTab] = useState<MobileTab>("kin");

  const isMobile = useResponsive(MOBILE_BREAKPOINT);

  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

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
    const savedMode = localStorage.getItem(RESPONSE_MODE_KEY);
    if (savedMode === "creative") {
      setResponseMode("creative");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RESPONSE_MODE_KEY, responseMode);
  }, [responseMode]);

  useEffect(() => {
    if (!currentKin) return;
    ensureKinState(currentKin);
  }, [currentKin, ensureKinState]);

  const applyChatUsage = (usage: Parameters<typeof normalizeUsage>[0]) => {
    const safeUsage = normalizeUsage(usage);

    setTokenStats((prev) => {
      const recentChatUsages = [...prev.recentChatUsages, safeUsage].slice(-5);

      return {
        ...prev,
        lastChatUsage: safeUsage,
        recentChatUsages,
        threadChatTotal: {
          inputTokens: prev.threadChatTotal.inputTokens + safeUsage.inputTokens,
          outputTokens: prev.threadChatTotal.outputTokens + safeUsage.outputTokens,
          totalTokens: prev.threadChatTotal.totalTokens + safeUsage.totalTokens,
        },
      };
    });
  };

  const applySummaryUsage = (usage: Parameters<typeof normalizeUsage>[0]) => {
    if (!usage) return;

    const safeUsage = normalizeUsage(usage);

    if (
      safeUsage.inputTokens === 0 &&
      safeUsage.outputTokens === 0 &&
      safeUsage.totalTokens === 0
    ) {
      return;
    }

    setTokenStats((prev) => ({
      ...prev,
      lastSummaryUsage: safeUsage,
      threadSummaryTotal: {
        inputTokens: prev.threadSummaryTotal.inputTokens + safeUsage.inputTokens,
        outputTokens: prev.threadSummaryTotal.outputTokens + safeUsage.outputTokens,
        totalTokens: prev.threadSummaryTotal.totalTokens + safeUsage.totalTokens,
      },
      summaryRunCount: prev.summaryRunCount + 1,
    }));
  };

  const resetTokenStats = () => {
    setTokenStats(emptyTokenStats());
  };

  const handleConnectKin = () => {
    connectKin();
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleSwitchKin = (id: string) => {
    switchKin(id);
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleDisconnectKin = () => {
    disconnectKin();
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleRemoveKin = (id: string) => {
    removeKinState(id);
    removeKin(id);
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const sendToKin = async () => {
    if (!kinInput.trim() || !currentKin || kinLoading) return;

    setKinStatus("idle");
    setKinLoading(true);

    const text = kinInput.trim();

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
    } catch (error) {
      console.error(error);
      setKinStatus("error");
    } finally {
      setKinLoading(false);
    }
  };

  const sendToGpt = async (instructionMode: GptInstructionMode = "normal") => {
    if (!gptInput.trim() || gptLoading) return;

    const text = gptInput.trim();

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text,
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);
    const provisionalMemory = getProvisionalMemory(text);

    setGptMessages((prev) => [...prev, userMsg]);
    setGptInput("");
    setGptLoading(true);

    setGptState((prev) => ({
      ...prev,
      memory: provisionalMemory,
    }));

    try {
      const res = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  mode: "chat",
  memory: provisionalMemory,
  recentMessages: newRecent,
  input: text,
  instructionMode,
  reasoningMode: responseMode, // ← これ
}),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text:
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply
            : "⚠️ GPTの返答取得に失敗しました",
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);
      applyChatUsage(data.usage);

      const memoryResult = await handleGptMemory(updatedRecent);
      applySummaryUsage(memoryResult.summaryUsage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        { id: generateId(), role: "gpt", text: "⚠️ GPT通信でエラーが発生しました" },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  const sendLastKinToGptDraft = () => {
    const last = [...kinMessages].reverse().find((m) => m.role === "kin");
    if (!last) return;

    setGptInput(last.text);

    if (isMobile) {
      setActiveTab("gpt");
    }
  };

  const sendLastGptToKinDraft = () => {
    const last = [...gptMessages].reverse().find((m) => m.role === "gpt");
    if (!last) return;

    setKinInput(last.text);

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const resetKinMessages = () => {
    setKinMessages([]);
  };

  const handleResetGpt = () => {
    setGptMessages([]);
    resetGptForCurrentKin();
    resetTokenStats();
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
      resetGptForCurrentKin={handleResetGpt}
      sendLastGptToKinDraft={sendLastGptToKinDraft}
      loading={gptLoading}
      gptBottomRef={gptBottomRef}
      memorySettings={memorySettings}
      defaultMemorySettings={defaultMemorySettings}
      onSaveMemorySettings={handleSaveMemorySettings}
      onResetMemorySettings={handleResetMemorySettings}
      tokenStats={tokenStats}
      responseMode={responseMode}
      onChangeResponseMode={setResponseMode}
      onSwitchPanel={() => setActiveTab("kin")}
      isMobile={isMobile}
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
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isMobile ? 0 : 12,
          padding: isMobile ? 0 : 12,
          overflow: "hidden",
        }}
      >
        {isMobile ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: activeTab === "kin" ? "flex" : "none",
              }}
            >
              {kinPanel}
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: activeTab === "gpt" ? "flex" : "none",
              }}
            >
              {gptPanel}
            </div>
          </div>
        ) : (
          <>
            {kinPanel}
            {gptPanel}
          </>
        )}
      </div>
    </div>
  );
}
