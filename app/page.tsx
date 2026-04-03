"use client";

import { useEffect, useRef, useState } from "react";
import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory } from "@/hooks/useGptMemory";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { createSession, getSessions } from "@/lib/storage";
import type { MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";
import { generateId } from "@/lib/uuid";
import {
  buildPrepInputFromIngestResult,
  formatTaskResultText,
  resolveUploadKindFromFile,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import type {
  GptInstructionMode,
  PostIngestAction,
} from "@/components/panels/gpt/gptPanelTypes";

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 1180;

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
  const [activeTab, setActiveTab] = useState<MobileTab>("kin");

  const isMobile = useResponsive(MOBILE_BREAKPOINT);
  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

  const {
    responseMode,
    setResponseMode,
    uploadKind,
    setUploadKind,
    ingestMode,
    setIngestMode,
    imageDetail,
    setImageDetail,
    postIngestAction,
    setPostIngestAction,
  } = usePersistedGptOptions();

  const {
    tokenStats,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    resetTokenStats,
  } = useTokenTracking();

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
    if (!currentKin) return;
    ensureKinState(currentKin);
  }, [currentKin, ensureKinState]);

  useEffect(() => {
    if (isMobile) {
      setActiveTab((prev) => (prev === "gpt" ? "gpt" : "kin"));
    }
  }, [isMobile]);

  const clearPendingKinInjection = () => {
    setPendingKinInjectionBlocks([]);
    setPendingKinInjectionIndex(0);
  };

  const resetBothPanels = () => {
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();
    clearPendingKinInjection();

    if (isMobile) {
      setActiveTab("kin");
    }
  };

  const handleConnectKin = () => {
    connectKin();
    resetBothPanels();
  };

  const handleSwitchKin = (id: string) => {
    switchKin(id);
    resetBothPanels();
  };

  const handleDisconnectKin = () => {
    disconnectKin();
    resetBothPanels();
  };

  const handleRemoveKin = (id: string) => {
    removeKinState(id);
    removeKin(id);
    resetBothPanels();
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
        typeof currentPendingBlock === "string" && text === currentPendingBlock.trim();

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

      if (data?.searchUsed) {
        applySearchUsage(data.usage);
      } else {
        applyChatUsage(data.usage);
      }

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

  const runPrepTaskFromInput = async () => {
    if (!gptInput.trim() || gptLoading) return;

    const text = gptInput.trim();
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[タスク整理依頼]\n${text}`,
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);

    setGptMessages((prev) => [...prev, userMsg]);
    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoPrepTask(text, "gpt-input");

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: formatTaskResultText(data?.parsed, data?.raw),
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);
      setGptState((prev) => ({
        ...prev,
        recentMessages: updatedRecent,
      }));

      applyTaskUsage(data?.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ タスク実行中にエラーが発生しました",
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  const runDeepenTaskFromLast = async () => {
    if (gptLoading) return;

    const last = gptMessages
      .slice()
      .reverse()
      .find((m) => m.role === "gpt");

    if (!last || !last.text.trim()) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 深掘り対象のGPTメッセージが見つかりません",
        },
      ]);
      return;
    }

    const text = last.text.trim();
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[深掘り依頼]\n${text}`,
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);

    setGptMessages((prev) => [...prev, userMsg]);
    setGptLoading(true);

    try {
      const data = await runAutoDeepenTask(text, "last-task-result");

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: formatTaskResultText(data?.parsed, data?.raw),
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);
      setGptState((prev) => ({
        ...prev,
        recentMessages: updatedRecent,
      }));

      applyTaskUsage(data?.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 深掘り中にエラーが発生しました",
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
    if (isMobile) setActiveTab("gpt");
  };

  const sendLastGptToKinDraft = () => {
    const last = [...gptMessages].reverse().find((m) => m.role === "gpt");
    if (!last) return;

    setKinInput(last.text);
    if (isMobile) setActiveTab("kin");
  };

  const injectFileToKinDraft = async (
    file: File,
    options: {
      kind: typeof uploadKind;
      mode: typeof ingestMode;
      detail: typeof imageDetail;
      action: PostIngestAction;
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
              "必要なら /api/ingest のレスポンス詳細を確認してください。",
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

      const prepInput = buildPrepInputFromIngestResult(data, file.name);
      let prepTaskText = "";
      let deepenTaskText = "";

      if (
        options.action === "inject_and_prep" ||
        options.action === "inject_prep_deepen"
      ) {
        try {
          const prepData = await runAutoPrepTask(prepInput, `ingest-${file.name}`);
          prepTaskText = formatTaskResultText(prepData?.parsed, prepData?.raw);
          applyTaskUsage(prepData?.usage);

          if (options.action === "inject_prep_deepen") {
            try {
              const deepenData = await runAutoDeepenTask(
                prepTaskText,
                `prep-${file.name}`
              );
              deepenTaskText = formatTaskResultText(
                deepenData?.parsed,
                deepenData?.raw
              );
              applyTaskUsage(deepenData?.usage);
            } catch (error) {
              console.error("auto deepen task failed", error);
              deepenTaskText = "⚠️ 自動深掘りに失敗しました";
            }
          }
        } catch (error) {
          console.error("auto prep task failed", error);
          prepTaskText = "⚠️ 抽出後の自動タスク整理に失敗しました";
        }
      }

      const title =
        typeof data?.result?.title === "string" && data.result.title.trim()
          ? data.result.title
          : file.name;

      const modeLine =
        resolvedKind === "text"
          ? `テキスト注入: ${options.mode}`
          : `画像詳細度: ${options.detail}`;

      const actionLabel =
        options.action === "inject_only"
          ? "注入のみ"
          : options.action === "inject_and_prep"
            ? "注入＋タスク整理"
            : "注入＋タスク整理＋深掘り";

      const messageParts = [
        "ファイルをKin注入用テキストに変換しました。",
        `タイトル: ${title}`,
        `対象: ${resolvedKind === "text" ? "テキスト" : "画像 / PDF"}`,
        modeLine,
        `注入後処理: ${actionLabel}`,
        `分割数: ${blocks.length}`,
        "",
        `Kin入力欄に 1/${blocks.length} をセットしました。送信後は次パートが自動で下書きに入ります。`,
      ];

      if (options.action !== "inject_only" && prepTaskText) {
        messageParts.push("", "--------------------", prepTaskText);
      }

      if (options.action === "inject_prep_deepen" && deepenTaskText) {
        messageParts.push("", "====================", "【自動深掘り結果】", deepenTaskText);
      }

      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: messageParts.join("\n"),
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
      runPrepTaskFromInput={runPrepTaskFromInput}
      runDeepenTaskFromLast={runDeepenTaskFromLast}
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
      postIngestAction={postIngestAction}
      onChangeUploadKind={setUploadKind}
      onChangeIngestMode={setIngestMode}
      onChangeImageDetail={setImageDetail}
      onChangePostIngestAction={setPostIngestAction}
      pendingInjectionCurrentPart={pendingKinInjectionIndex + 1}
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
        overflow: "visible",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isMobile ? 0 : 12,
          padding: isMobile ? 0 : 12,
          overflow: "visible",
        }}
      >
        {isMobile ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              position: "relative",
              overflow: "visible",
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
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{kinPanel}</div>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{gptPanel}</div>
          </>
        )}
      </div>
    </div>
  );
}
