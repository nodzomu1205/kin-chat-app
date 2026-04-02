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
import type {
  FileUploadKind,
  GptInstructionMode,
  ImageDetail,
  IngestMode,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 1180;
const RESPONSE_MODE_KEY = "gpt_response_mode";
const UPLOAD_KIND_KEY = "gpt_upload_kind";
const INGEST_MODE_KEY = "gpt_ingest_mode";
const IMAGE_DETAIL_KEY = "gpt_image_detail";

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function resolveUploadKindFromFile(
  file: File,
  requestedKind: FileUploadKind
): FileUploadKind {
  const ext = getExtension(file.name);

  const visualExtensions = new Set([
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "bmp",
    "svg",
  ]);

  const textExtensions = new Set([
    "txt",
    "md",
    "json",
    "csv",
    "tsv",
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "java",
    "go",
    "rs",
    "c",
    "cpp",
    "cs",
    "rb",
    "php",
    "html",
    "css",
    "xml",
    "yml",
    "yaml",
    "sql",
  ]);

  if (visualExtensions.has(ext) || file.type.startsWith("image/")) {
    return "visual";
  }

  if (
    textExtensions.has(ext) ||
    file.type.startsWith("text/") ||
    file.type === "application/json"
  ) {
    return "text";
  }

  return requestedKind;
}

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
  const [tokenStats, setTokenStats] = useState<TokenStats>(emptyTokenStats());
  const [responseMode, setResponseMode] = useState<ResponseMode>("strict");
  const [uploadKind, setUploadKind] = useState<FileUploadKind>("text");
  const [ingestMode, setIngestMode] = useState<IngestMode>("compact");
  const [imageDetail, setImageDetail] = useState<ImageDetail>("basic");
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

    const savedUploadKind = localStorage.getItem(UPLOAD_KIND_KEY);
    if (savedUploadKind === "visual") {
      setUploadKind("visual");
    }

    const savedIngestMode = localStorage.getItem(INGEST_MODE_KEY);
    if (savedIngestMode === "full") {
      setIngestMode("full");
    }

    const savedImageDetail = localStorage.getItem(IMAGE_DETAIL_KEY);
    if (
      savedImageDetail === "basic" ||
      savedImageDetail === "detailed" ||
      savedImageDetail === "max"
    ) {
      setImageDetail(savedImageDetail);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RESPONSE_MODE_KEY, responseMode);
  }, [responseMode]);

  useEffect(() => {
    localStorage.setItem(UPLOAD_KIND_KEY, uploadKind);
  }, [uploadKind]);

  useEffect(() => {
    localStorage.setItem(INGEST_MODE_KEY, ingestMode);
  }, [ingestMode]);

  useEffect(() => {
    localStorage.setItem(IMAGE_DETAIL_KEY, imageDetail);
  }, [imageDetail]);

  useEffect(() => {
    if (!currentKin) return;
    ensureKinState(currentKin);
  }, [currentKin, ensureKinState]);

  useEffect(() => {
    if (isMobile) {
      setActiveTab((prev) => (prev === "gpt" ? "gpt" : "kin"));
    }
  }, [isMobile]);

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
        outputTokens:
          prev.threadSummaryTotal.outputTokens + safeUsage.outputTokens,
        totalTokens: prev.threadSummaryTotal.totalTokens + safeUsage.totalTokens,
      },
      summaryRunCount: prev.summaryRunCount + 1,
    }));
  };

  const resetTokenStats = () => {
    setTokenStats(emptyTokenStats());
  };

  const clearPendingKinInjection = () => {
    setPendingKinInjectionBlocks([]);
    setPendingKinInjectionIndex(0);
  };

  const handleConnectKin = () => {
    connectKin();
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();
    clearPendingKinInjection();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleSwitchKin = (id: string) => {
    switchKin(id);
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();
    clearPendingKinInjection();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleDisconnectKin = () => {
    disconnectKin();
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();
    clearPendingKinInjection();

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
    clearPendingKinInjection();

    if (isMobile) {
      setActiveTab("kin");
    }
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
        typeof currentPendingBlock === "string" &&
        text === currentPendingBlock.trim();

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
          reasoningMode: responseMode,
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
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ GPT通信でエラーが発生しました",
        },
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

  const injectFileToKinDraft = async (
    file: File,
    options: {
      kind: FileUploadKind;
      mode: IngestMode;
      detail: ImageDetail;
    }
  ) => {
    if (ingestLoading) return;

    if (!currentKin) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 先にKinを接続してから注入してください。",
        },
      ]);
      return;
    }

    const resolvedKind = resolveUploadKindFromFile(file, options.kind);

    setIngestLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", resolvedKind);
      form.append("mode", options.mode);
      form.append("detail", options.detail);

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText =
          typeof data?.error === "string"
            ? data.error
            : "⚠️ ファイル変換に失敗しました";

        setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "gpt",
            text:
              `${errorText}\n\n` +
              `必要なら /api/ingest のレスポンス詳細を確認してください。`,
          },
        ]);
        return;
      }

      const blocks: string[] = Array.isArray(data?.kinBlocks) ? data.kinBlocks : [];

      if (blocks.length === 0) {
        setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "gpt",
            text: "⚠️ Kin注入用ブロックを生成できませんでした",
          },
        ]);
        return;
      }

      setPendingKinInjectionBlocks(blocks);
      setPendingKinInjectionIndex(0);
      setKinInput(blocks[0]);
      setUploadKind(resolvedKind);

      const title =
        typeof data?.result?.title === "string" && data.result.title.trim()
          ? data.result.title
          : file.name;

      const modeLine =
        resolvedKind === "text"
          ? `テキスト注入: ${options.mode}`
          : `画像詳細度: ${options.detail}`;

      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text:
            `ファイルをKin注入用テキストに変換しました。\n` +
            `タイトル: ${title}\n` +
            `対象: ${resolvedKind === "text" ? "テキスト" : "画像 / PDF"}\n` +
            `${modeLine}\n` +
            `分割数: ${blocks.length}\n\n` +
            `Kin入力欄に 1/${blocks.length} をセットしました。送信後は次パートが自動で下書きに入ります。`,
        },
      ]);

      if (isMobile) {
        setActiveTab("kin");
      }
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ ファイル変換中にエラーが発生しました",
        },
      ]);
    } finally {
      setIngestLoading(false);
    }
  };

  const resetKinMessages = () => {
    setKinMessages([]);
    clearPendingKinInjection();
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
      resetGptForCurrentKin={handleResetGpt}
      sendLastGptToKinDraft={sendLastGptToKinDraft}
      injectFileToKinDraft={injectFileToKinDraft}
      canInjectFile={!!currentKin}
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
      onChangeUploadKind={setUploadKind}
      onChangeIngestMode={setIngestMode}
      onChangeImageDetail={setImageDetail}
      pendingInjectionCurrentPart={
        pendingKinInjectionBlocks.length > 0 ? pendingKinInjectionIndex + 1 : 0
      }
      pendingInjectionTotalParts={pendingKinInjectionBlocks.length}
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
              minWidth: 0,
              position: "relative",
              overflow: "hidden",
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
            {kinPanel}
            {gptPanel}
          </>
        )}
      </div>
    </div>
  );
}