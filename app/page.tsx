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
  buildMergedTaskInput,
  buildTaskStructuredInput,
  buildTaskInput,
  formatTaskResultText,
  resolveUploadKindFromFile,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import type {
  GptInstructionMode,
  PostIngestAction,
} from "@/components/panels/gpt/gptPanelTypes";
import type { SearchContext, TaskDraft } from "@/types/task";
import { createEmptyTaskDraft } from "@/types/task";
import {
  createTaskSource,
  resolveTaskName,
  resetTaskDraft,
} from "@/lib/app/taskDraftHelpers";
import { parseTaskInput } from "@/lib/taskInputParser";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
  extractPreferredKinTransferText,
  formatTaskSlot,
} from "@/lib/app/kinStructuredProtocol";
import {
  buildKinDirectiveLines,
  resolveTransformIntent,
  shouldTransformContent,
  splitTextIntoKinChunks,
  transformTextWithIntent,
} from "@/lib/app/transformIntent";
import { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import { parseTaskIntentFromText, looksLikeTaskInstruction } from "@/lib/taskIntent";
import {
  buildTaskChatBridgeContext,
  shouldInjectTaskContext,
} from "@/lib/taskChatBridge";

const toTransformResponseMode = (
  mode: "strict" | "balanced" | "creative"
): "strict" | "creative" => {
  if (mode === "balanced") return "strict";
  return mode;
};

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
  const [currentTaskDraft, setCurrentTaskDraft] = useState<TaskDraft>(
    createEmptyTaskDraft()
  );
  const [lastSearchContext, setLastSearchContext] = useState<SearchContext | null>(
    null
  );

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
    fileReadPolicy,
    setFileReadPolicy,
  } = usePersistedGptOptions();

  const {
    tokenStats,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    applyIngestUsage,
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

  const taskProtocol = useKinTaskProtocol();

  const [chatBridgeSettings] = useState<ChatBridgeSettings>({
    injectTaskContextOnReference: true,
    alwaysShowCurrentTaskInChatContext: false,
  });

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

  const resetCurrentTaskDraft = () => {
    setCurrentTaskDraft(resetTaskDraft());
  };

  const updateTaskDraftFields = (patch: Partial<TaskDraft>) => {
    setCurrentTaskDraft((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  };

  const applyPrefixedTaskFieldsFromText = (text: string) => {
    const parsed = parseTaskInput(text);

    if (parsed.title || parsed.userInstruction) {
      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: parsed.title || prev.title,
        taskName: parsed.title?.trim() ? parsed.title.trim() : prev.taskName,
        userInstruction: parsed.userInstruction || prev.userInstruction,
        updatedAt: new Date().toISOString(),
      }));
    }

    return parsed;
  };

  const getTaskSlotLabel = () => formatTaskSlot(currentTaskDraft.slot);

  const getTaskBaseText = () => {
    if (currentTaskDraft.body.trim()) return currentTaskDraft.body.trim();
    if (currentTaskDraft.mergedText.trim()) return currentTaskDraft.mergedText.trim();
    if (currentTaskDraft.deepenText.trim()) return currentTaskDraft.deepenText.trim();
    if (currentTaskDraft.prepText.trim()) return currentTaskDraft.prepText.trim();

    const last = [...gptMessages].reverse().find((m) => m.role === "gpt");
    return last?.text?.trim() || "";
  };


  const syncTaskDraftFromProtocol = (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
  }) => {
    setCurrentTaskDraft((prev) => ({
      ...prev,
      title: params.title,
      taskName: params.title,
      userInstruction: params.goal,
      body: params.compiledTaskPrompt,
      mergedText: params.compiledTaskPrompt,
      kinTaskText: params.compiledTaskPrompt,
      status: "formatted",
      updatedAt: new Date().toISOString(),
    }));
  };

  const runStartKinTaskFromInput = () => {
    const raw = gptInput.trim();
    if (!raw) return;

    const intent = parseTaskIntentFromText(raw);
    const started = taskProtocol.startTask({
      originalInstruction: raw,
      intent,
    });

    syncTaskDraftFromProtocol({
      taskId: started.taskId,
      title: started.title,
      goal: intent.goal,
      compiledTaskPrompt: started.compiledTaskPrompt,
    });

    setKinInput(started.compiledTaskPrompt);
    setGptInput("");
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: `✅ 新しいKinタスクを生成してKin入力欄にセットしました。TASK_ID: #${started.taskId}`,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);

    if (isMobile) setActiveTab("kin");
  };

  const resetBothPanels = () => {
    setKinMessages([]);
    setGptMessages([]);
    resetTokenStats();
    clearPendingKinInjection();
    resetCurrentTaskDraft();
    setLastSearchContext(null);

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

    const rawText = gptInput.trim();
    const parsedInput = applyPrefixedTaskFieldsFromText(rawText);

    const hasSearch = !!parsedInput.searchQuery;
    const hasTaskDirectives = !!(parsedInput.title || parsedInput.userInstruction);

    if (hasTaskDirectives && !hasSearch && !parsedInput.freeText) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "✅ タスクのタイトル / 追加指示を更新しました。",
          meta: {
            kind: "task_info",
            sourceType: "manual",
          },
        },
      ]);
      setGptInput("");
      return;
    }

    const requestText = [
      parsedInput.searchQuery ? `検索：${parsedInput.searchQuery}` : "",
      parsedInput.freeText || "",
    ]
      .filter(Boolean)
      .join("\n");

    let finalRequestText = requestText || rawText;

    if (
      shouldInjectTaskContext({
        userInput: rawText,
        settings: chatBridgeSettings,
      })
    ) {
      const taskContext = buildTaskChatBridgeContext(taskProtocol.runtime);
      finalRequestText = `${taskContext}

${finalRequestText}`;
    }

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: rawText,
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);
    const provisionalMemory = getProvisionalMemory(finalRequestText);

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
          input: finalRequestText,
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
        meta: {
          kind: "normal",
          sourceType: data?.searchUsed ? "search" : "gpt_input",
        },
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);

      if (data?.searchUsed) {
        applySearchUsage(data.usage);

        setLastSearchContext({
          query:
            (typeof data?.searchQuery === "string" && data.searchQuery.trim()) ||
            parsedInput.searchQuery ||
            finalRequestText,
          rawText:
            typeof data?.searchEvidence === "string" ? data.searchEvidence : "",
          sources: Array.isArray(data?.sources) ? data.sources : [],
          createdAt: new Date().toISOString(),
        });
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
    const parsedInput = applyPrefixedTaskFieldsFromText(text);

    const taskBodySource = parsedInput.freeText || text;
    const prepInput = buildTaskStructuredInput({
      title:
        parsedInput.title ||
        currentTaskDraft.title ||
        resolveTaskName(currentTaskDraft, "GPT会話から作成したタスク"),
      userInstruction:
        parsedInput.userInstruction || currentTaskDraft.userInstruction,
      body: taskBodySource,
      searchRawText: currentTaskDraft.searchContext?.rawText || "",
    });

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
      const data = await runAutoPrepTask(prepInput, "gpt-input");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: taskText,
        meta: {
          kind: "task_prep",
          sourceType: "gpt_input",
        },
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);
      setGptState((prev) => ({
        ...prev,
        recentMessages: updatedRecent,
      }));

      const source = createTaskSource("gpt_chat", "GPT手入力タスク", text);

      setCurrentTaskDraft((prev) => {
        const resolvedTitle =
          parsedInput.title.trim() ||
          prev.title ||
          resolveTaskName(prev, "GPT会話から作成したタスク");

        return {
          ...prev,
          taskName: resolvedTitle,
          title: resolvedTitle,
          userInstruction: parsedInput.userInstruction || prev.userInstruction,
          body: taskText,
          searchContext: currentTaskDraft.searchContext ?? prev.searchContext,
          objective: (parsedInput.freeText || text).slice(0, 120),
          prepText: taskText,
          deepenText: "",
          mergedText: taskText,
          kinTaskText: "",
          status: "prepared",
          sources: [...prev.sources, source],
          updatedAt: new Date().toISOString(),
        };
      });

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

  const runUpdateTaskFromInput = async () => {
    if (!gptInput.trim() || gptLoading) return;

    const currentTaskText = getTaskBaseText();

    if (!currentTaskText) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 更新対象の現在タスクが見つかりません。先にタスク整理を実行してください。",
        },
      ]);
      return;
    }

    const additionalText = gptInput.trim();
    const parsedInput = applyPrefixedTaskFieldsFromText(additionalText);

    const mergedInput = buildMergedTaskInput(
      currentTaskText,
      "GPT手入力補足",
      parsedInput.freeText || additionalText,
      {
        title: parsedInput.title || currentTaskDraft.title,
        userInstruction:
          parsedInput.userInstruction || currentTaskDraft.userInstruction,
        searchRawText: currentTaskDraft.searchContext?.rawText || "",
      }
    );

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[タスク更新]\n${additionalText}`,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);

    setGptMessages((prev) => [...prev, userMsg]);
    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoPrepTask(mergedInput, "task-update");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: taskText,
        meta: {
          kind: "task_prep",
          sourceType: "manual",
        },
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);
      setGptState((prev) => ({
        ...prev,
        recentMessages: updatedRecent,
      }));

      const source = createTaskSource(
        "manual_note",
        "GPT手入力補足",
        parsedInput.freeText || additionalText
      );

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: parsedInput.title || prev.title,
        taskName: parsedInput.title?.trim()
          ? parsedInput.title.trim()
          : prev.taskName,
        userInstruction: parsedInput.userInstruction || prev.userInstruction,
        body: taskText,
        prepText: prev.prepText || prev.mergedText,
        deepenText: "",
        mergedText: taskText,
        kinTaskText: "",
        status: "prepared",
        sources: [...prev.sources, source],
        updatedAt: new Date().toISOString(),
      }));

      applyTaskUsage(data?.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ タスク更新中にエラーが発生しました",
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  const runUpdateTaskFromLastGptMessage = async () => {
    if (gptLoading) return;

    const currentTaskText = getTaskBaseText();

    if (!currentTaskText) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 更新対象の現在タスクが見つかりません。先にタスク整理を実行してください。",
        },
      ]);
      return;
    }

    const lastGptMessage = [...gptMessages]
      .reverse()
      .find((m) => m.role === "gpt" && typeof m.text === "string" && m.text.trim());

    if (!lastGptMessage) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 取込対象の最新GPTメッセージが見つかりません。",
        },
      ]);
      return;
    }

    const parsedInput = applyPrefixedTaskFieldsFromText(gptInput.trim());

    const taskInput = buildTaskInput({
      title: parsedInput.title || currentTaskDraft.title,
      userInstruction:
        parsedInput.userInstruction || currentTaskDraft.userInstruction,
      actionInstruction: parsedInput.freeText || gptInput.trim(),
      body: currentTaskText,
      material: lastGptMessage.text.trim(),
    });

    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoPrepTask(taskInput, "task-update-last-gpt");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: ["【最新レス取込によるタスク更新結果】", taskText].join("\n\n"),
          meta: {
            kind: "task_prep",
            sourceType: "gpt_input",
          },
        },
      ]);

      const source = createTaskSource(
        "manual_note",
        "GPT最新レス",
        lastGptMessage.text.trim()
      );

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: parsedInput.title || prev.title,
        taskName: parsedInput.title?.trim()
          ? parsedInput.title.trim()
          : prev.taskName,
        userInstruction: parsedInput.userInstruction || prev.userInstruction,
        body: taskText,
        deepenText: "",
        mergedText: taskText,
        kinTaskText: "",
        status: "prepared",
        sources: [...prev.sources, source],
        updatedAt: new Date().toISOString(),
      }));

      applyTaskUsage(data?.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 最新レス取込によるタスク更新に失敗しました",
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  const runAttachSearchResultToTask = async () => {
    if (gptLoading) return;

    const currentTaskText = getTaskBaseText();

    if (!currentTaskText) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 統合対象の現在タスクが見つかりません。先にタスク整理を実行してください。",
        },
      ]);
      return;
    }

    const searchRaw = lastSearchContext?.rawText?.trim();

    if (!searchRaw) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 統合対象の検索結果が見つかりません。先に検索を実行してください。",
        },
      ]);
      return;
    }

    const parsedInput = applyPrefixedTaskFieldsFromText(gptInput.trim());

    const taskInput = buildTaskInput({
      title: parsedInput.title || currentTaskDraft.title,
      userInstruction:
        parsedInput.userInstruction || currentTaskDraft.userInstruction,
      actionInstruction: parsedInput.freeText || gptInput.trim(),
      body: currentTaskText,
      material: searchRaw,
    });

    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoPrepTask(taskInput, "attach-search-result");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: ["【検索結果を統合したタスク更新結果】", taskText].join("\n\n"),
          meta: {
            kind: "task_prep",
            sourceType: "search",
          },
        },
      ]);

      const source = createTaskSource(
        "web_search",
        `検索結果: ${lastSearchContext?.query || "未設定"}`,
        searchRaw
      );

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: parsedInput.title || prev.title,
        taskName: parsedInput.title?.trim()
          ? parsedInput.title.trim()
          : prev.taskName,
        userInstruction: parsedInput.userInstruction || prev.userInstruction,
        body: taskText,
        searchContext: lastSearchContext ?? prev.searchContext,
        deepenText: "",
        mergedText: taskText,
        kinTaskText: "",
        status: "prepared",
        sources: [...prev.sources, source],
        updatedAt: new Date().toISOString(),
      }));

      applyTaskUsage(data?.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 検索結果の現在タスクへの統合に失敗しました",
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  const runDeepenTaskFromLast = async () => {
    if (gptLoading) return;

    const text = getTaskBaseText();

    if (!text) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 深掘り対象のタスク内容が見つかりません",
        },
      ]);
      return;
    }

    const parsedInput = applyPrefixedTaskFieldsFromText(gptInput.trim());

    const taskInput = buildTaskInput({
      title: parsedInput.title || currentTaskDraft.title,
      userInstruction:
        parsedInput.userInstruction || currentTaskDraft.userInstruction,
      actionInstruction: parsedInput.freeText || gptInput.trim(),
      body: text,
      material: text,
    });

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[深掘り依頼]\n${parsedInput.freeText || "（追加指示なし）"}`,
      meta: {
        kind: "task_info",
      },
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);

    setGptMessages((prev) => [...prev, userMsg]);
    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoDeepenTask(taskInput, "current-task");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: taskText,
        meta: {
          kind: "task_deepen",
        },
      };

      const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

      setGptMessages((prev) => [...prev, assistantMsg]);
      setGptState((prev) => ({
        ...prev,
        recentMessages: updatedRecent,
      }));

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: parsedInput.title || prev.title,
        taskName: parsedInput.title?.trim()
          ? parsedInput.title.trim()
          : prev.taskName,
        userInstruction: parsedInput.userInstruction || prev.userInstruction,
        body: taskText,
        deepenText: taskText,
        mergedText: taskText,
        kinTaskText: "",
        status: "deepened",
        updatedAt: new Date().toISOString(),
      }));

      applyTaskUsage(data?.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 深掘りタスク実行中にエラーが発生しました",
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  const sendLastKinToGptDraft = () => {
    const last = [...kinMessages].reverse().find((m) => m.role === "kin");
    if (!last) return;

    setGptInput(extractPreferredKinTransferText(last.text));
    if (isMobile) setActiveTab("gpt");
  };

  const sendLastGptToKinDraft = () => {
    const last = [...gptMessages].reverse().find((m) => m.role === "gpt");
    if (!last) return;

    setKinInput(last.text);
    if (isMobile) setActiveTab("kin");
  };

  const sendLatestGptContentToKin = async () => {
    const last = [...gptMessages]
      .reverse()
      .find((m) => m.role === "gpt" && typeof m.text === "string" && m.text.trim());

    if (!last) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ Kinへ送る対象の最新GPTレスが見つかりません",
        },
      ]);
      return;
    }

    const directiveText = gptInput.trim();
    const { intent, usage } = await resolveTransformIntent({
      input: directiveText,
      defaultMode: "sys_info",
      responseMode: toTransformResponseMode(responseMode),
    });
    applyTaskUsage(usage);

    let content = last.text.trim();

    if (shouldTransformContent(intent)) {
      setGptLoading(true);
      try {
        const transformed = await transformTextWithIntent({
          text: content,
          intent,
          responseMode: toTransformResponseMode(responseMode),
        });
        content = transformed.text.trim() || content;
        applyTaskUsage(transformed.usage);
      } catch (error) {
        console.error(error);
        setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "gpt",
            text: "⚠️ Kin送信用の変換に失敗したため、元の本文で続行しました。",
          },
        ]);
      } finally {
        setGptLoading(false);
      }
    }

    const directiveLines = buildKinDirectiveLines(intent);
    const block =
      intent.mode === "sys_task"
        ? buildKinSysTaskBlock({
            taskSlot: currentTaskDraft.slot,
            title: currentTaskDraft.title || "GPT最新レス",
            content,
            directiveLines,
          })
        : buildKinSysInfoBlock({
            taskSlot: currentTaskDraft.slot,
            title: currentTaskDraft.title || "GPT最新レス",
            sourceLabel: "gpt_latest_response",
            content,
            directiveLines,
          });

    setKinInput(block);
    setGptInput("");

    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: `✅ 最新GPTレスを ${intent.mode === "sys_task" ? "<<SYS_TASK>>" : "<<SYS_INFO>>"} 形式でKin入力欄にセットしました。TASK_ID: ${getTaskSlotLabel()}`,
        meta: {
          kind: "task_info",
          sourceType: "gpt_chat",
        },
      },
    ]);

    if (isMobile) setActiveTab("kin");
  };

  const sendCurrentTaskContentToKin = async () => {
    const rawDirective = gptInput.trim();

    if (rawDirective && looksLikeTaskInstruction(rawDirective)) {
      runStartKinTaskFromInput();
      return;
    }

    const sourceText = getTaskBaseText();

    if (!sourceText) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ Kinへ送る対象の現在タスクが見つかりません",
        },
      ]);
      return;
    }

    const directiveText = gptInput.trim();
    const { intent, usage } = await resolveTransformIntent({
      input: directiveText,
      defaultMode: "sys_task",
      responseMode: toTransformResponseMode(responseMode),
    });
    applyTaskUsage(usage);

    let content = sourceText.trim();

    if (shouldTransformContent(intent)) {
      setGptLoading(true);
      try {
        const transformed = await transformTextWithIntent({
          text: content,
          intent,
          responseMode: toTransformResponseMode(responseMode),
        });
        content = transformed.text.trim() || content;
        applyTaskUsage(transformed.usage);
      } catch (error) {
        console.error(error);
        setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "gpt",
            text: "⚠️ 現在タスクの変換に失敗したため、元の本文で続行しました。",
          },
        ]);
      } finally {
        setGptLoading(false);
      }
    }

    const directiveLines = buildKinDirectiveLines(intent);
    const block =
      intent.mode === "sys_info"
        ? buildKinSysInfoBlock({
            taskSlot: currentTaskDraft.slot,
            title: currentTaskDraft.title || "現在タスク",
            sourceLabel: "current_task",
            content,
            directiveLines,
          })
        : buildKinSysTaskBlock({
            taskSlot: currentTaskDraft.slot,
            title: currentTaskDraft.title || "現在タスク",
            content,
            directiveLines,
          });

    setKinInput(block);
    setGptInput("");

    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: `✅ 現在タスクを ${intent.mode === "sys_task" ? "<<SYS_TASK>>" : "<<SYS_INFO>>"} 形式でKin入力欄にセットしました。TASK_ID: ${getTaskSlotLabel()}`,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);

    if (isMobile) setActiveTab("kin");
  };

  const receiveLastKinResponseToGptInput = () => {
    const last = [...kinMessages]
      .reverse()
      .find((m) => m.role === "kin" && typeof m.text === "string" && m.text.trim());

    if (!last) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "⚠️ 取込対象のKin最新レスが見つかりません",
        },
      ]);
      return;
    }

    setGptInput(extractPreferredKinTransferText(last.text));

    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "✅ Kin最新レスをGPT入力欄に取り込みました。必要に応じて編集してから送信してください。",
        meta: {
          kind: "task_info",
          sourceType: "kin_message",
        },
      },
    ]);

    if (isMobile) setActiveTab("gpt");
  };

  const injectFileToKinDraft = async (
    file: File,
    options: {
      kind: typeof uploadKind;
      mode: typeof ingestMode;
      detail: typeof imageDetail;
      action: PostIngestAction;
      readPolicy: typeof fileReadPolicy;
    }
  ) => {
    if (ingestLoading) return;

    const resolvedKind = resolveUploadKindFromFile(file, options.kind);
    setIngestLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", resolvedKind);
      form.append("mode", options.mode);
      form.append("detail", options.detail);
      form.append("readPolicy", options.readPolicy);

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

      const fileTitle =
        typeof data?.result?.title === "string" && data.result.title.trim()
          ? data.result.title.trim()
          : file.name;

      applyIngestUsage(data?.usage);

      const prepInputBase = buildPrepInputFromIngestResult(data, file.name);
      let prepInput = prepInputBase;

      const directiveText = gptInput.trim();
      const { intent, usage } = await resolveTransformIntent({
        input: directiveText,
        defaultMode: "sys_info",
        responseMode: toTransformResponseMode(responseMode),
      });
      applyTaskUsage(usage);

      if (shouldTransformContent(intent)) {
        try {
          const transformed = await transformTextWithIntent({
            text: prepInputBase,
            intent,
            responseMode: toTransformResponseMode(responseMode),
          });
          prepInput = transformed.text.trim() || prepInputBase;
          applyTaskUsage(transformed.usage);
        } catch (error) {
          console.error("file transform failed", error);
          setGptMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "gpt",
              text: "⚠️ ファイル追加指示の反映に失敗したため、元の取込内容で続行しました。",
              meta: {
                kind: "task_info",
                sourceType: "file_ingest",
              },
            },
          ]);
        }
      }

      const directiveLines = buildKinDirectiveLines(intent);
      const chunks = splitTextIntoKinChunks(prepInput, 3400, 260);
      const blocks: string[] = chunks.map((chunk, index) =>
        intent.mode === "sys_task"
          ? buildKinSysTaskBlock({
              taskSlot: currentTaskDraft.slot,
              title: fileTitle,
              content: chunk,
              directiveLines,
            })
          : buildKinSysInfoBlock({
              taskSlot: currentTaskDraft.slot,
              title: fileTitle,
              sourceLabel: "file_ingest",
              content: chunk,
              directiveLines,
              partIndex: index + 1,
              partTotal: chunks.length,
            })
      );

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
      setGptInput("");

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

      const modeLine =
        resolvedKind === "text"
          ? `テキスト注入: ${options.mode}`
          : `画像詳細度: ${options.detail}`;

      const readPolicyLabel =
        options.readPolicy === "text_first"
          ? "文字優先"
          : options.readPolicy === "visual_first"
            ? "視覚優先"
            : "統合";

      const actionLabel =
        options.action === "inject_only"
          ? "注入のみ"
          : options.action === "inject_and_prep"
            ? "注入＋タスク整理"
            : options.action === "inject_prep_deepen"
              ? "注入＋タスク整理＋深掘り"
              : "現在タスクに追加";

      const messageParts = [
        "ファイルをKin注入用テキストに変換しました。",
        `タイトル: ${fileTitle}`,
        `対象: ${resolvedKind === "text" ? "テキスト" : "画像 / PDF"}`,
        `読込方針: ${readPolicyLabel}`,
        modeLine,
        `注入後処理: ${actionLabel}`,
        `分割数: ${blocks.length}`,
        "",
        `Kin入力欄に 1/${blocks.length} をセットしました。送信後は次パートが自動で下書きに入ります。`,
      ];

      if (options.action === "inject_only") {
        messageParts.push("", "--------------------", "【取込内容】", prepInput);
      }

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
          meta: {
            kind: "task_info",
            sourceType: "file_ingest",
          },
        },
      ]);

      if (options.action === "attach_to_current_task") {
        const currentTaskText = getTaskBaseText();

        if (!currentTaskText) {
          setGptMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "gpt",
              text: "⚠️ 現在タスクが未作成のため、ファイルを追加統合できません。先にタスク整理を行ってください。",
            },
          ]);
        } else {
          const mergedInput = buildMergedTaskInput(
            currentTaskText,
            `FILE: ${file.name}`,
            prepInput,
            {
              title: currentTaskDraft.title || fileTitle || file.name,
              userInstruction: currentTaskDraft.userInstruction,
              searchRawText: currentTaskDraft.searchContext?.rawText || "",
            }
          );

          try {
            const mergeData = await runAutoPrepTask(
              mergedInput,
              `attach-${file.name}`
            );
            const mergedTaskText = formatTaskResultText(
              mergeData?.parsed,
              mergeData?.raw
            );

            applyTaskUsage(mergeData?.usage);

            setGptMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "gpt",
                text: ["【現在タスク更新結果】", mergedTaskText].join("\n\n"),
                meta: {
                  kind: "task_prep",
                  sourceType: "file_ingest",
                },
              },
            ]);

            const source = createTaskSource(
              "file_ingest",
              `FILE: ${file.name}`,
              prepInput
            );

            setCurrentTaskDraft((prev) => ({
              ...prev,
              taskName: resolveTaskName(prev, fileTitle || file.name),
              title: resolveTaskName(prev, fileTitle || file.name),
              body: mergedTaskText,
              objective: prev.objective || `ファイル ${file.name} を統合したタスク`,
              deepenText: "",
              mergedText: mergedTaskText,
              kinTaskText: "",
              status: "prepared",
              sources: [...prev.sources, source],
              updatedAt: new Date().toISOString(),
            }));
          } catch (error) {
            console.error("attach current task failed", error);
            setGptMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "gpt",
                text: "⚠️ ファイル内容の現在タスクへの統合に失敗しました",
              },
            ]);
          }
        }
      }

      const source = createTaskSource("file_ingest", `FILE: ${file.name}`, prepInput);

      if (options.action === "inject_and_prep" && prepTaskText) {
        setCurrentTaskDraft((prev) => ({
          ...prev,
          taskName: fileTitle || file.name,
          title: fileTitle || file.name,
          body: prepTaskText,
          objective: `ファイル ${file.name} の整理`,
          prepText: prepTaskText,
          deepenText: "",
          mergedText: prepTaskText,
          kinTaskText: "",
          status: "prepared",
          sources: [...prev.sources, source],
          updatedAt: new Date().toISOString(),
        }));
      }

      if (options.action === "inject_prep_deepen") {
        const finalText = deepenTaskText || prepTaskText;
        if (finalText) {
          setCurrentTaskDraft((prev) => ({
            ...prev,
            taskName: fileTitle || file.name,
            title: fileTitle || file.name,
            body: finalText,
            objective: `ファイル ${file.name} の整理`,
            prepText: prepTaskText,
            deepenText: deepenTaskText,
            mergedText: finalText,
            kinTaskText: "",
            status: deepenTaskText ? "deepened" : "prepared",
            sources: [...prev.sources, source],
            updatedAt: new Date().toISOString(),
          }));
        }
      }

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
    resetCurrentTaskDraft();
    setLastSearchContext(null);
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
      runUpdateTaskFromInput={runUpdateTaskFromInput}
      runUpdateTaskFromLastGptMessage={runUpdateTaskFromLastGptMessage}
      runAttachSearchResultToTask={runAttachSearchResultToTask}
      sendLatestGptContentToKin={sendLatestGptContentToKin}
      sendCurrentTaskContentToKin={sendCurrentTaskContentToKin}
      receiveLastKinResponseToGptInput={receiveLastKinResponseToGptInput}
      resetGptForCurrentKin={handleResetGpt}
      sendLastGptToKinDraft={sendLastGptToKinDraft}
      injectFileToKinDraft={injectFileToKinDraft}
      canInjectFile={!gptLoading && !ingestLoading}
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
      fileReadPolicy={fileReadPolicy}
      onChangeUploadKind={setUploadKind}
      onChangeIngestMode={setIngestMode}
      onChangeImageDetail={setImageDetail}
      onChangePostIngestAction={setPostIngestAction}
      onChangeFileReadPolicy={setFileReadPolicy}
      pendingInjectionCurrentPart={
        pendingKinInjectionBlocks.length > 0 ? pendingKinInjectionIndex + 1 : 0
      }
      pendingInjectionTotalParts={pendingKinInjectionBlocks.length}
      onSwitchPanel={() => setActiveTab("kin")}
      isMobile={isMobile}
      taskProgressView={taskProtocol.progressView}
      onAnswerTaskRequest={(requestId) => {
        setGptInput(
          `REQ ${requestId} への回答:\n\nこれを適切な SYS_ACTION USER_RESPONSE 形式に整えてください。`
        );
      }}
      onStartKinTask={runStartKinTaskFromInput}
      currentTaskDraft={currentTaskDraft}
      onChangeTaskTitle={(value) =>
        updateTaskDraftFields({
          title: value,
          taskName: value.trim() || currentTaskDraft.taskName,
        })
      }
      onChangeTaskUserInstruction={(value) =>
        updateTaskDraftFields({
          userInstruction: value,
        })
      }
      onChangeTaskBody={(value) =>
        updateTaskDraftFields({
          body: value,
          mergedText: value,
        })
      }
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
