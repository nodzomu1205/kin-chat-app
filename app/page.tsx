"use client";

import React, { useEffect, useRef, useState } from "react";
import KinPanel from "@/components/KinPanel";
import GptPanel from "@/components/GptPanel";
import { getSessions, createSession } from "@/lib/storage";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory, type TokenUsage } from "@/hooks/useGptMemory";
import type { Message } from "@/types/chat";
import type { MemorySettings } from "@/lib/memory";
import { generateId } from "@/lib/uuid";

type GptInstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

type TokenStats = {
  lastChatUsage: TokenUsage | null;
  recentChatUsages: TokenUsage[];
  threadChatTotal: TokenUsage;
  lastSummaryUsage: TokenUsage | null;
  threadSummaryTotal: TokenUsage;
};

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 768;

const emptyUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});

const emptyTokenStats = (): TokenStats => ({
  lastChatUsage: null,
  recentChatUsages: [],
  threadChatTotal: emptyUsage(),
  lastSummaryUsage: null,
  threadSummaryTotal: emptyUsage(),
});

export default function ChatApp() {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setCurrentSessionId] = useState<string | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats>(emptyTokenStats());

  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("kin");

  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);

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

  const currentKinProfile =
    kinList.find((kin) => kin.id === currentKin) ?? null;

  const currentKinLabel = currentKinProfile?.label ?? null;

  useEffect(() => {
    const sessions = getSessions();
    if (sessions.length === 0) {
      const newSession = createSession();
      setCurrentSessionId(newSession.id);
    } else {
      setCurrentSessionId(sessions[0].id);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    if (kinMessages.length === 0) return;
    kinBottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [kinMessages]);

  useEffect(() => {
    if (gptMessages.length === 0) return;
    gptBottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [gptMessages]);

  useEffect(() => {
    if (!currentKin) return;
    ensureKinState(currentKin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKin]);

  const normalizeUsage = (usage: TokenUsage | null | undefined): TokenUsage => {
    if (!usage) return emptyUsage();

    return {
      inputTokens:
        typeof usage.inputTokens === "number" ? usage.inputTokens : 0,
      outputTokens:
        typeof usage.outputTokens === "number" ? usage.outputTokens : 0,
      totalTokens:
        typeof usage.totalTokens === "number"
          ? usage.totalTokens
          : (usage.inputTokens || 0) + (usage.outputTokens || 0),
    };
  };

  const applyChatUsage = (usage: TokenUsage | null | undefined) => {
    const safeUsage = normalizeUsage(usage);

    setTokenStats((prev) => {
      const recentChatUsages = [...prev.recentChatUsages, safeUsage].slice(-5);

      return {
        ...prev,
        lastChatUsage: safeUsage,
        recentChatUsages,
        threadChatTotal: {
          inputTokens: prev.threadChatTotal.inputTokens + safeUsage.inputTokens,
          outputTokens:
            prev.threadChatTotal.outputTokens + safeUsage.outputTokens,
          totalTokens: prev.threadChatTotal.totalTokens + safeUsage.totalTokens,
        },
      };
    });
  };

  const applySummaryUsage = (usage: TokenUsage | null | undefined) => {
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
        inputTokens:
          prev.threadSummaryTotal.inputTokens + safeUsage.inputTokens,
        outputTokens:
          prev.threadSummaryTotal.outputTokens + safeUsage.outputTokens,
        totalTokens:
          prev.threadSummaryTotal.totalTokens + safeUsage.totalTokens,
      },
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
    if (!kinInput.trim() || !currentKin) return;

    setKinStatus("idle");

    const text = kinInput.trim();

    setKinMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text },
    ]);
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
        { id: generateId(), role: "kin", text: data.reply },
      ]);

      setKinStatus("connected");
    } catch {
      setKinStatus("error");
    }
  };

  const sendToGpt = async (
    instructionMode: GptInstructionMode = "normal"
  ) => {
    if (!gptInput.trim()) return;

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
    setLoading(true);

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
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: data.reply,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);

      applyChatUsage(data.usage);

      const memoryResult = await handleGptMemory(updatedRecent);
      applySummaryUsage(memoryResult.summaryUsage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      loading={loading}
      gptBottomRef={gptBottomRef}
      memorySettings={memorySettings}
      defaultMemorySettings={defaultMemorySettings}
      onSaveMemorySettings={handleSaveMemorySettings}
      onResetMemorySettings={handleResetMemorySettings}
      tokenStats={tokenStats}
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
              display: "flex",
              overflow: "hidden",
            }}
          >
            {activeTab === "kin" ? kinPanel : gptPanel}
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