import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { KinMemoryState, Message } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import type { GptInstructionMode } from "@/components/panels/gpt/gptPanelTypes";
import { generateId } from "@/lib/uuid";
import {
  buildMergedTaskInput,
  buildTaskInput,
  buildTaskStructuredInput,
  formatTaskResultText,
  runAutoDeepenTask,
  runAutoPrepTask,
  runFormatTaskForKin,
} from "@/lib/app/gptTaskClient";
import {
  createTaskSource,
  resolveTaskName,
} from "@/lib/app/taskDraftHelpers";
import {
  resolveDraftTitle,
  shouldUpdateTopic,
  suggestTaskTitle,
  suggestTopicLabel,
} from "@/lib/app/contextNaming";
import { routeTaskInput } from "@/lib/app/taskRouting";
import { buildKinSysInfoFromTask, parseKinInstructionMessage } from "@/lib/app/kinStructuredProtocol";
import type { TokenUsage } from "@/hooks/useGptMemory";
import { normalizeUsage } from "@/lib/tokenStats";

type UsageInput = Parameters<typeof normalizeUsage>[0];

type UseGptActionsArgs = {
  gptInput: string;
  setGptInput: Dispatch<SetStateAction<string>>;
  gptLoading: boolean;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  gptMessages: Message[];
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  kinMessages: Message[];
  gptStateRef: MutableRefObject<KinMemoryState>;
  setGptState: Dispatch<SetStateAction<KinMemoryState>>;
  getProvisionalMemory: (input: string) => KinMemoryState["memory"];
  handleGptMemory: (updatedRecent: Message[]) => Promise<{ summaryUsage: TokenUsage | null }>;
  chatRecentLimit: number;
  responseMode: "strict" | "creative";
  currentTaskDraft: TaskDraft;
  setCurrentTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  lastSearchContext: SearchContext | null;
  setLastSearchContext: Dispatch<SetStateAction<SearchContext | null>>;
  applyChatUsage: (usage: UsageInput) => void;
  applySummaryUsage: (usage: UsageInput) => void;
  applySearchUsage: (usage: UsageInput) => void;
  applyTaskUsage: (usage: UsageInput) => void;
  setKinInput: Dispatch<SetStateAction<string>>;
  isMobile: boolean;
  onSwitchToKin?: () => void;
};

export function useGptActions(args: UseGptActionsArgs) {
  const {
    gptInput,
    setGptInput,
    gptLoading,
    setGptLoading,
    gptMessages,
    setGptMessages,
    kinMessages,
    gptStateRef,
    setGptState,
    getProvisionalMemory,
    handleGptMemory,
    chatRecentLimit,
    responseMode,
    currentTaskDraft,
    setCurrentTaskDraft,
    lastSearchContext,
    setLastSearchContext,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    setKinInput,
    isMobile,
    onSwitchToKin,
  } = args;

  const appendGptSystemMessage = useCallback((text: string, meta?: Message["meta"]) => {
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text,
        meta,
      },
    ]);
  }, [setGptMessages]);

  const patchTaskDraft = useCallback((patch: Partial<TaskDraft>) => {
    setCurrentTaskDraft((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  }, [setCurrentTaskDraft]);

  const updateTaskDraftFromParsed = useCallback((text: string) => {
    const routed = routeTaskInput(text);

    if (routed.parsed.title || routed.parsed.userInstruction) {
      patchTaskDraft({
        title:
          routed.parsed.title ||
          resolveDraftTitle(currentTaskDraft, {
            explicitTitle: currentTaskDraft.title,
            fallback: currentTaskDraft.taskName,
          }),
        taskName:
          routed.parsed.title?.trim() ||
          currentTaskDraft.taskName,
        userInstruction:
          routed.parsed.userInstruction || currentTaskDraft.userInstruction,
      });
    }

    return routed;
  }, [currentTaskDraft, patchTaskDraft]);

  const getTaskBaseText = useCallback(() => {
    if (currentTaskDraft.body.trim()) return currentTaskDraft.body.trim();
    if (currentTaskDraft.mergedText.trim()) return currentTaskDraft.mergedText.trim();
    if (currentTaskDraft.deepenText.trim()) return currentTaskDraft.deepenText.trim();
    if (currentTaskDraft.prepText.trim()) return currentTaskDraft.prepText.trim();

    const last = [...gptMessages].reverse().find((m) => m.role === "gpt");
    return last?.text?.trim() || "";
  }, [currentTaskDraft, gptMessages]);

  const syncTopicFromRoute = useCallback((routed: ReturnType<typeof routeTaskInput>) => {
    if (!routed.shouldAutoUpdateTopic) return;

    const nextTopic = suggestTopicLabel({
      explicitTitle: routed.parsed.title,
      searchQuery: routed.parsed.searchQuery,
      freeText: routed.parsed.freeText,
      fallback: gptStateRef.current.memory.context.currentTopic || "会話",
    });

    const prevTopic = gptStateRef.current.memory.context.currentTopic;
    if (!shouldUpdateTopic(prevTopic, nextTopic)) return;

    setGptState((prev) => ({
      ...prev,
      memory: {
        ...prev.memory,
        context: {
          ...prev.memory.context,
          currentTopic: nextTopic,
        },
      },
    }));
  }, [gptStateRef, setGptState]);

  const sendToGpt = useCallback(async (instructionMode: GptInstructionMode = "normal") => {
    if (!gptInput.trim() || gptLoading) return;

    const routed = updateTaskDraftFromParsed(gptInput.trim());

    if (routed.shouldUpdateDraftOnly) {
      appendGptSystemMessage("✅ タスクのタイトル / 追加指示を更新しました。", {
        kind: "task_info",
        sourceType: "manual",
      });
      setGptInput("");
      syncTopicFromRoute(routed);
      return;
    }

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: routed.rawText,
    };

    const baseRecent = gptStateRef.current.recentMessages || [];
    const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);
    const provisionalMemory = getProvisionalMemory(routed.finalRequestText);

    if (routed.shouldAutoUpdateTopic) {
      const nextTopic = suggestTopicLabel({
        explicitTitle: routed.parsed.title,
        searchQuery: routed.parsed.searchQuery,
        freeText: routed.parsed.freeText,
        fallback: provisionalMemory.context.currentTopic || "会話",
      });

      if (shouldUpdateTopic(provisionalMemory.context.currentTopic, nextTopic)) {
        provisionalMemory.context.currentTopic = nextTopic;
      }
    }

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
          input: routed.finalRequestText,
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
            routed.parsed.searchQuery ||
            routed.finalRequestText,
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
      appendGptSystemMessage("⚠️ GPT通信でエラーが発生しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyChatUsage,
    applySearchUsage,
    applySummaryUsage,
    chatRecentLimit,
    getProvisionalMemory,
    gptInput,
    gptLoading,
    gptStateRef,
    handleGptMemory,
    responseMode,
    setGptInput,
    setGptLoading,
    setGptMessages,
    setGptState,
    setLastSearchContext,
    updateTaskDraftFromParsed,
  ]);

  const runPrepTaskFromInput = useCallback(async () => {
    if (!gptInput.trim() || gptLoading) return;

    const routed = updateTaskDraftFromParsed(gptInput.trim());
    const taskBodySource = routed.parsed.freeText || routed.rawText;
    const resolvedTitle = resolveDraftTitle(currentTaskDraft, {
      explicitTitle: routed.parsed.title,
      searchQuery: routed.parsed.searchQuery,
      freeText: taskBodySource,
      fallback: "GPT会話から作成したタスク",
    });

    const prepInput = buildTaskStructuredInput({
      title: resolvedTitle,
      userInstruction:
        routed.parsed.userInstruction || currentTaskDraft.userInstruction,
      body: taskBodySource,
      searchRawText: currentTaskDraft.searchContext?.rawText || "",
    });

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[タスク整理依頼]\n${routed.rawText}`,
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
        memory: {
          ...prev.memory,
          context: {
            ...prev.memory.context,
            currentTopic: suggestTopicLabel({
              explicitTitle: routed.parsed.title,
              searchQuery: routed.parsed.searchQuery,
              freeText: taskBodySource,
              fallback: prev.memory.context.currentTopic || resolvedTitle,
            }),
            currentTask: resolvedTitle,
          },
        },
      }));

      const source = createTaskSource("gpt_chat", "GPT手入力タスク", routed.rawText);

      setCurrentTaskDraft((prev) => ({
        ...prev,
        taskName: resolvedTitle,
        title: resolvedTitle,
        userInstruction: routed.parsed.userInstruction || prev.userInstruction,
        body: taskText,
        searchContext: currentTaskDraft.searchContext ?? prev.searchContext,
        objective: taskBodySource.slice(0, 120),
        prepText: taskText,
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
      appendGptSystemMessage("⚠️ タスク実行中にエラーが発生しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyTaskUsage,
    chatRecentLimit,
    currentTaskDraft,
    gptInput,
    gptLoading,
    gptStateRef,
    setCurrentTaskDraft,
    setGptInput,
    setGptLoading,
    setGptMessages,
    setGptState,
    updateTaskDraftFromParsed,
  ]);

  const runUpdateTaskFromInput = useCallback(async () => {
    if (!gptInput.trim() || gptLoading) return;

    const currentTaskText = getTaskBaseText();
    if (!currentTaskText) {
      appendGptSystemMessage("⚠️ 更新対象の現在タスクが見つかりません。先にタスク整理を実行してください。");
      return;
    }

    const routed = updateTaskDraftFromParsed(gptInput.trim());
    const mergedInput = buildMergedTaskInput(
      currentTaskText,
      "GPT手入力補足",
      routed.parsed.freeText || routed.rawText,
      {
        title: resolveDraftTitle(currentTaskDraft, {
          explicitTitle: routed.parsed.title,
          searchQuery: routed.parsed.searchQuery,
          freeText: routed.parsed.freeText || routed.rawText,
        }),
        userInstruction:
          routed.parsed.userInstruction || currentTaskDraft.userInstruction,
        searchRawText: currentTaskDraft.searchContext?.rawText || "",
      }
    );

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[タスク更新]\n${routed.rawText}`,
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
        routed.parsed.freeText || routed.rawText
      );
      const resolvedTitle = resolveDraftTitle(currentTaskDraft, {
        explicitTitle: routed.parsed.title,
        searchQuery: routed.parsed.searchQuery,
        freeText: routed.parsed.freeText || routed.rawText,
      });

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: resolvedTitle,
        taskName: resolvedTitle,
        userInstruction: routed.parsed.userInstruction || prev.userInstruction,
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
      appendGptSystemMessage("⚠️ タスク更新中にエラーが発生しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyTaskUsage,
    chatRecentLimit,
    currentTaskDraft,
    getTaskBaseText,
    gptInput,
    gptLoading,
    gptStateRef,
    setCurrentTaskDraft,
    setGptInput,
    setGptLoading,
    setGptMessages,
    setGptState,
    updateTaskDraftFromParsed,
  ]);

  const runUpdateTaskFromLastGptMessage = useCallback(async () => {
    if (gptLoading) return;

    const currentTaskText = getTaskBaseText();
    if (!currentTaskText) {
      appendGptSystemMessage("⚠️ 更新対象の現在タスクが見つかりません。先にタスク整理を実行してください。");
      return;
    }

    const lastGptMessage = [...gptMessages]
      .reverse()
      .find((m) => m.role === "gpt" && typeof m.text === "string" && m.text.trim());

    if (!lastGptMessage) {
      appendGptSystemMessage("⚠️ 取込対象の最新GPTメッセージが見つかりません。");
      return;
    }

    const routed = updateTaskDraftFromParsed(gptInput.trim());
    const resolvedTitle = resolveDraftTitle(currentTaskDraft, {
      explicitTitle: routed.parsed.title,
      searchQuery: routed.parsed.searchQuery,
      freeText: routed.parsed.freeText || gptInput.trim(),
    });

    const taskInput = buildTaskInput({
      title: resolvedTitle,
      userInstruction:
        routed.parsed.userInstruction || currentTaskDraft.userInstruction,
      actionInstruction: routed.parsed.freeText || gptInput.trim(),
      body: currentTaskText,
      material: lastGptMessage.text.trim(),
    });

    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoPrepTask(taskInput, "task-update-last-gpt");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      appendGptSystemMessage(["【最新レス取込によるタスク更新結果】", taskText].join("\n\n"), {
        kind: "task_prep",
        sourceType: "gpt_input",
      });

      const source = createTaskSource("manual_note", "GPT最新レス", lastGptMessage.text.trim());

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: resolvedTitle,
        taskName: resolvedTitle,
        userInstruction: routed.parsed.userInstruction || prev.userInstruction,
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
      appendGptSystemMessage("⚠️ 最新レス取込によるタスク更新に失敗しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyTaskUsage,
    currentTaskDraft,
    getTaskBaseText,
    gptInput,
    gptLoading,
    gptMessages,
    setCurrentTaskDraft,
    setGptInput,
    setGptLoading,
    updateTaskDraftFromParsed,
  ]);

  const runAttachSearchResultToTask = useCallback(async () => {
    if (gptLoading) return;

    const currentTaskText = getTaskBaseText();
    if (!currentTaskText) {
      appendGptSystemMessage("⚠️ 統合対象の現在タスクが見つかりません。先にタスク整理を実行してください。");
      return;
    }

    const searchRaw = lastSearchContext?.rawText?.trim();
    if (!searchRaw) {
      appendGptSystemMessage("⚠️ 統合対象の検索結果が見つかりません。先に検索を実行してください。");
      return;
    }

    const routed = updateTaskDraftFromParsed(gptInput.trim());
    const resolvedTitle = resolveDraftTitle(currentTaskDraft, {
      explicitTitle: routed.parsed.title,
      searchQuery: routed.parsed.searchQuery || lastSearchContext?.query,
      freeText: routed.parsed.freeText || gptInput.trim(),
    });

    const taskInput = buildTaskInput({
      title: resolvedTitle,
      userInstruction:
        routed.parsed.userInstruction || currentTaskDraft.userInstruction,
      actionInstruction: routed.parsed.freeText || gptInput.trim(),
      body: currentTaskText,
      material: searchRaw,
    });

    setGptInput("");
    setGptLoading(true);

    try {
      const data = await runAutoPrepTask(taskInput, "attach-search-result");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);

      appendGptSystemMessage(["【検索結果を統合したタスク更新結果】", taskText].join("\n\n"), {
        kind: "task_prep",
        sourceType: "search",
      });

      const source = createTaskSource(
        "web_search",
        `検索結果: ${lastSearchContext?.query || "未設定"}`,
        searchRaw
      );

      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: resolvedTitle,
        taskName: resolvedTitle,
        userInstruction: routed.parsed.userInstruction || prev.userInstruction,
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
      appendGptSystemMessage("⚠️ 検索結果の現在タスクへの統合に失敗しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyTaskUsage,
    currentTaskDraft,
    getTaskBaseText,
    gptInput,
    gptLoading,
    lastSearchContext,
    setCurrentTaskDraft,
    setGptInput,
    setGptLoading,
    updateTaskDraftFromParsed,
  ]);

  const runDeepenTaskFromLast = useCallback(async () => {
    if (gptLoading) return;

    const text = getTaskBaseText();
    if (!text) {
      appendGptSystemMessage("⚠️ 深掘り対象のタスク内容が見つかりません");
      return;
    }

    const routed = updateTaskDraftFromParsed(gptInput.trim());
    const resolvedTitle = resolveDraftTitle(currentTaskDraft, {
      explicitTitle: routed.parsed.title,
      searchQuery: routed.parsed.searchQuery,
      freeText: routed.parsed.freeText || gptInput.trim(),
      fallback: currentTaskDraft.title || "深掘りタスク",
    });

    const taskInput = buildTaskInput({
      title: resolvedTitle,
      userInstruction:
        routed.parsed.userInstruction || currentTaskDraft.userInstruction,
      actionInstruction: routed.parsed.freeText || gptInput.trim(),
      body: text,
      material: text,
    });

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: `[深掘り依頼]\n${routed.parsed.freeText || "（追加指示なし）"}`,
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
        title: resolvedTitle,
        taskName: resolvedTitle,
        userInstruction: routed.parsed.userInstruction || prev.userInstruction,
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
      appendGptSystemMessage("⚠️ 深掘りタスク実行中にエラーが発生しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyTaskUsage,
    chatRecentLimit,
    currentTaskDraft,
    getTaskBaseText,
    gptInput,
    gptLoading,
    gptStateRef,
    setCurrentTaskDraft,
    setGptInput,
    setGptLoading,
    setGptMessages,
    setGptState,
    updateTaskDraftFromParsed,
  ]);

  const sendTaskToKinDraft = useCallback(async () => {
    if (gptLoading) return;

    const sourceText = getTaskBaseText();
    if (!sourceText) {
      appendGptSystemMessage("⚠️ Kinタスク化する対象のタスク内容が見つかりません");
      return;
    }

    setGptLoading(true);
    try {
      const data = await runFormatTaskForKin(sourceText, "current-task");
      const kinTaskText =
        typeof data?.raw === "string" && data.raw.trim()
          ? data.raw.trim()
          : "⚠️ Kinタスク化に失敗しました";

      setKinInput(kinTaskText);
      applyTaskUsage(data?.usage);

      setCurrentTaskDraft((prev) => ({
        ...prev,
        kinTaskText,
        status: "formatted",
        updatedAt: new Date().toISOString(),
      }));

      appendGptSystemMessage(
        "✅ 現在タスクを英語メタ構造の <<TASK>> 形式に変換し、Kin入力欄にセットしました。",
        { kind: "task_format" }
      );

      if (isMobile) {
        onSwitchToKin?.();
      }
    } catch (error) {
      console.error(error);
      appendGptSystemMessage("⚠️ Kinタスク変換中にエラーが発生しました");
    } finally {
      setGptLoading(false);
    }
  }, [
    appendGptSystemMessage,
    applyTaskUsage,
    getTaskBaseText,
    gptLoading,
    isMobile,
    onSwitchToKin,
    setCurrentTaskDraft,
    setGptLoading,
    setKinInput,
  ]);


  const importLastKinInstructionToTask = useCallback(() => {
    const lastKin = [...kinMessages].reverse().find((m) => m.role === "kin");
    if (!lastKin?.text?.trim()) {
      appendGptSystemMessage("⚠️ 取込対象のKin返答が見つかりません");
      return;
    }

    const parsed = parseKinInstructionMessage(lastKin.text);
    const suggestedTitle = suggestTaskTitle({
      explicitTitle: currentTaskDraft.title,
      freeText: parsed.request || parsed.suggestedTitle,
      fallback: parsed.suggestedTitle,
    });

    setCurrentTaskDraft((prev) => ({
      ...prev,
      title: suggestedTitle,
      taskName: suggestedTitle,
      userInstruction: parsed.userInstruction || prev.userInstruction,
      body: parsed.body,
      mergedText: parsed.body,
      status: "prepared",
      sources: [
        createTaskSource("kin_message", "Kin instruction", parsed.rawBlock),
        ...prev.sources,
      ].slice(0, 12),
      updatedAt: new Date().toISOString(),
    }));

    setGptState((prev) => ({
      ...prev,
      memory: {
        ...prev.memory,
        context: {
          ...prev.memory.context,
          currentTopic: suggestedTitle,
        },
      },
    }));

    appendGptSystemMessage(
      "✅ 最新のKin返答を <<KIN_INSTRUCTION>> 系素材としてタスク状態へ取り込みました。",
      { kind: "task_info", sourceType: "kin_message" }
    );
  }, [
    appendGptSystemMessage,
    currentTaskDraft.title,
    kinMessages,
    setCurrentTaskDraft,
    setGptState,
  ]);

  const sendSysInfoToKinDraft = useCallback(() => {
    const lastGpt = [...gptMessages].reverse().find((m) => m.role === "gpt");
    const block = buildKinSysInfoFromTask({
      title:
        currentTaskDraft.title?.trim() ||
        currentTaskDraft.taskName?.trim() ||
        "GPT整理結果",
      taskBody: getTaskBaseText(),
      taskUserInstruction: currentTaskDraft.userInstruction,
      fallbackText: lastGpt?.text,
    });

    if (!block.trim()) {
      appendGptSystemMessage("⚠️ <<SYS_INFO>> 化する対象テキストが見つかりません");
      return;
    }

    setKinInput(block);
    appendGptSystemMessage(
      "✅ 現在タスク / 最新GPT結果を <<SYS_INFO>> 形式に整え、Kin入力欄にセットしました。",
      { kind: "task_info", sourceType: "gpt_chat" }
    );

    if (isMobile) {
      onSwitchToKin?.();
    }
  }, [
    appendGptSystemMessage,
    currentTaskDraft.taskName,
    currentTaskDraft.title,
    currentTaskDraft.userInstruction,
    getTaskBaseText,
    gptMessages,
    isMobile,
    onSwitchToKin,
    setKinInput,
  ]);

  const suggestCurrentTaskTitle = useCallback((text: string) => {
    return suggestTaskTitle({
      explicitTitle: currentTaskDraft.title,
      searchQuery: currentTaskDraft.searchContext?.query,
      freeText: text,
      fallback: currentTaskDraft.taskName || "タスク",
    });
  }, [currentTaskDraft]);

  return {
    sendToGpt,
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
    sendTaskToKinDraft,
    importLastKinInstructionToTask,
    sendSysInfoToKinDraft,
    getTaskBaseText,
    patchTaskDraft,
    suggestCurrentTaskTitle,
  };
}
