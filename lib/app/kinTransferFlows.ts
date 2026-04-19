import { generateId } from "@/lib/uuid";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
  summarizeTaskContentForKinInfo,
} from "@/lib/app/kinStructuredProtocol";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/kinTaskInjection";
import { buildKinDirectiveLines } from "@/lib/app/transformIntent";
import type { TransformIntent } from "@/lib/app/transformIntent";
import { addUsage, emptyUsage, normalizeUsage } from "@/lib/tokenStats";
import type { BucketUsageOptions } from "@/lib/tokenStats";
import type { Message } from "@/types/chat";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/taskIntent";
import type { TaskIntent } from "@/types/taskProtocol";
import { findLatestTransferableGptMessage } from "@/lib/app/latestGptMessage";

type ResolveTransformIntentResult = {
  intent: TransformIntent;
  usage?: Parameters<typeof normalizeUsage>[0];
};

type ResolveTaskIntentResult = {
  intent: TaskIntent;
  usage?: Parameters<typeof normalizeUsage>[0];
  pendingCandidates: PendingIntentCandidate[];
};

type SendLatestGptContentToKinArgs = {
  gptMessages: Message[];
  gptInput: string;
  currentTaskSlot: number;
  currentTaskTitle: string;
  approvedIntentPhrases: ApprovedIntentPhrase[];
  resolveTransformIntent: (args: {
    input: string;
    defaultMode: "sys_info" | "sys_task";
    responseMode: "strict" | "creative";
  }) => Promise<ResolveTransformIntentResult>;
  resolveTaskIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    responseMode: "strict" | "creative";
  }) => Promise<ResolveTaskIntentResult>;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  startTask: (params: {
    originalInstruction: string;
    intent: TaskIntent;
    title?: string;
  }) => { taskId: string; title: string; compiledTaskPrompt: string };
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
  }) => void;
  responseMode: "strict" | "creative";
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    responseMode: "strict" | "creative";
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  setGptLoading: (value: boolean) => void;
  setGptMessages: (updater: (prev: Message[]) => Message[]) => void;
  setPendingKinInjectionBlocks: (value: string[]) => void;
  setPendingKinInjectionIndex: (value: number) => void;
  setKinInput: (value: string) => void;
  setGptInput: (value: string) => void;
  getTaskSlotLabel: () => string;
  setActiveTabToKin?: () => void;
};

export async function sendLatestGptContentToKinFlow({
  gptMessages,
  gptInput,
  currentTaskSlot,
  currentTaskTitle,
  approvedIntentPhrases,
  resolveTransformIntent,
  resolveTaskIntent,
  mergePendingIntentCandidates,
  startTask,
  syncTaskDraftFromProtocol,
  responseMode,
  applyTaskUsage,
  shouldTransformContent,
  transformTextWithIntent,
  setGptLoading,
  setGptMessages,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setKinInput,
  setGptInput,
  getTaskSlotLabel,
  setActiveTabToKin,
}: SendLatestGptContentToKinArgs) {
  let accumulatedTaskUsage = emptyUsage();
  const addTaskUsage = (usage: Parameters<typeof normalizeUsage>[0]) => {
    accumulatedTaskUsage = addUsage(accumulatedTaskUsage, normalizeUsage(usage));
  };
  const flushTaskUsage = () => {
    applyTaskUsage(accumulatedTaskUsage);
  };

  const last = findLatestTransferableGptMessage(gptMessages);

  if (!last) {
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "No recent GPT response was found to send to Kin.",
      },
    ]);
    return;
  }

  const directiveText = gptInput.trim();
  const { intent, usage } = await resolveTransformIntent({
    input: directiveText,
    defaultMode: "sys_info",
    responseMode,
  });
  addTaskUsage(usage);

  let content = last.text.trim();

  if (intent.mode === "sys_task") {
    const resolved = await resolveTaskIntent({
      input: directiveText || content,
      approvedPhrases: approvedIntentPhrases,
      responseMode,
    });
    addTaskUsage(resolved.usage);
    if (resolved.pendingCandidates.length > 0) {
      mergePendingIntentCandidates(resolved.pendingCandidates);
    }

    const started = startTask({
      originalInstruction: directiveText || content,
      intent: resolved.intent,
    });

    syncTaskDraftFromProtocol({
      taskId: started.taskId,
      title: started.title,
      goal: resolved.intent.goal,
      compiledTaskPrompt: started.compiledTaskPrompt,
      originalInstruction: directiveText || content,
    });

    const injection = applyCompiledTaskPromptToKinInput({
      compiledTaskPrompt: started.compiledTaskPrompt,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
    });
    setGptInput("");
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text:
          injection.partCount > 1
            ? `Latest GPT content was converted into a formal Kin task and split into ${injection.partCount} Kin parts. TASK_ID: #${started.taskId}`
            : `Latest GPT content was converted into a formal Kin task and set to Kin input. TASK_ID: #${started.taskId}`,
        meta: {
          kind: "task_info",
          sourceType: "gpt_chat",
        },
      },
    ]);
    flushTaskUsage();
    setActiveTabToKin?.();
    return;
  }

  if (shouldTransformContent(intent)) {
    setGptLoading(true);
    try {
      const transformed = await transformTextWithIntent({
        text: content,
        intent,
        responseMode,
      });
      content = transformed.text.trim() || content;
      addTaskUsage(transformed.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "Transforming the latest GPT response for Kin failed. The original text is kept.",
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  }

  const directiveLines = buildKinDirectiveLines(intent);
  const block = buildKinSysInfoBlock({
    taskSlot: currentTaskSlot,
    title: currentTaskTitle || "Latest GPT response",
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
      text: `Latest GPT content was set to Kin input as ${intent.mode === "sys_task" ? "<<SYS_TASK>>" : "<<SYS_INFO>>"}. TASK_SLOT: ${getTaskSlotLabel()}`,
      meta: {
        kind: "task_info",
        sourceType: "gpt_chat",
      },
    },
  ]);
  flushTaskUsage();
  setActiveTabToKin?.();
}

type SendCurrentTaskContentToKinArgs = {
  gptInput: string;
  getTaskBaseText: () => string;
  currentTaskSlot: number;
  currentTaskTitle: string;
  currentTaskInstruction?: string;
  approvedIntentPhrases: ApprovedIntentPhrase[];
  looksLikeTaskInstruction: (text: string) => boolean;
  runStartKinTaskFromInput: () => void | Promise<void>;
  resolveTransformIntent: (args: {
    input: string;
    defaultMode: "sys_info" | "sys_task";
    responseMode: "strict" | "creative";
  }) => Promise<ResolveTransformIntentResult>;
  resolveTaskIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    responseMode: "strict" | "creative";
  }) => Promise<ResolveTaskIntentResult>;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  startTask: (params: {
    originalInstruction: string;
    intent: TaskIntent;
    title?: string;
  }) => { taskId: string; title: string; compiledTaskPrompt: string };
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
  }) => void;
  responseMode: "strict" | "creative";
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    responseMode: "strict" | "creative";
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  setGptLoading: (value: boolean) => void;
  setGptMessages: (updater: (prev: Message[]) => Message[]) => void;
  setPendingKinInjectionBlocks: (value: string[]) => void;
  setPendingKinInjectionIndex: (value: number) => void;
  setKinInput: (value: string) => void;
  setGptInput: (value: string) => void;
  getTaskSlotLabel: () => string;
  setActiveTabToKin?: () => void;
};

function appendCurrentTaskInfoMessage(
  setGptMessages: SendCurrentTaskContentToKinArgs["setGptMessages"],
  text: string
) {
  setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    },
  ]);
}

export async function sendCurrentTaskContentToKinFlow({
  gptInput,
  getTaskBaseText,
  currentTaskSlot,
  currentTaskTitle,
  currentTaskInstruction,
  approvedIntentPhrases,
  looksLikeTaskInstruction,
  runStartKinTaskFromInput,
  resolveTransformIntent,
  resolveTaskIntent,
  mergePendingIntentCandidates,
  startTask,
  syncTaskDraftFromProtocol,
  responseMode,
  applyTaskUsage,
  shouldTransformContent,
  transformTextWithIntent,
  setGptLoading,
  setGptMessages,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setKinInput,
  setGptInput,
  getTaskSlotLabel,
  setActiveTabToKin,
}: SendCurrentTaskContentToKinArgs) {
  let accumulatedTaskUsage = emptyUsage();
  const addTaskUsage = (usage: Parameters<typeof normalizeUsage>[0]) => {
    accumulatedTaskUsage = addUsage(accumulatedTaskUsage, normalizeUsage(usage));
  };
  const flushTaskUsage = () => {
    applyTaskUsage(accumulatedTaskUsage);
  };

  const rawDirective = gptInput.trim();

  if (rawDirective && looksLikeTaskInstruction(rawDirective)) {
    await runStartKinTaskFromInput();
    return;
  }

  const sourceText = getTaskBaseText();
  const { intent, usage } = await resolveTransformIntent({
    input: rawDirective,
    defaultMode: "sys_task",
    responseMode,
  });
  addTaskUsage(usage);

  if (!sourceText && intent.mode === "sys_task" && rawDirective) {
    const resolved = await resolveTaskIntent({
      input: rawDirective,
      approvedPhrases: approvedIntentPhrases,
      responseMode,
    });
    addTaskUsage(resolved.usage);
    if (resolved.pendingCandidates.length > 0) {
      mergePendingIntentCandidates(resolved.pendingCandidates);
    }

    const started = startTask({
      originalInstruction: rawDirective,
      intent: resolved.intent,
    });

    syncTaskDraftFromProtocol({
      taskId: started.taskId,
      title: started.title,
      goal: resolved.intent.goal,
      compiledTaskPrompt: started.compiledTaskPrompt,
      originalInstruction: rawDirective,
    });

    const injection = applyCompiledTaskPromptToKinInput({
      compiledTaskPrompt: started.compiledTaskPrompt,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
    });
    setGptInput("");
    appendCurrentTaskInfoMessage(
      setGptMessages,
      injection.partCount > 1
        ? `Current instruction was converted into a formal Kin task and split into ${injection.partCount} Kin parts. TASK_ID: #${started.taskId}`
        : `Current instruction was converted into a formal Kin task and set to Kin input. TASK_ID: #${started.taskId}`
    );
    flushTaskUsage();
    setActiveTabToKin?.();
    return;
  }

  if (!sourceText) {
    appendCurrentTaskInfoMessage(
      setGptMessages,
      "No current task content was found to send to Kin."
    );
    return;
  }

  let content =
    intent.mode === "sys_info"
      ? summarizeTaskContentForKinInfo(sourceText, currentTaskTitle || "Current task")
      : sourceText.trim();

  if (intent.mode === "sys_task") {
    const taskInstruction =
      rawDirective ||
      currentTaskInstruction?.trim() ||
      currentTaskTitle?.trim() ||
      content;
    const resolved = await resolveTaskIntent({
      input: taskInstruction,
      approvedPhrases: approvedIntentPhrases,
      responseMode,
    });
    addTaskUsage(resolved.usage);
    if (resolved.pendingCandidates.length > 0) {
      mergePendingIntentCandidates(resolved.pendingCandidates);
    }

    const started = startTask({
      originalInstruction: taskInstruction,
      intent: resolved.intent,
    });

    syncTaskDraftFromProtocol({
      taskId: started.taskId,
      title: started.title,
      goal: resolved.intent.goal,
      compiledTaskPrompt: started.compiledTaskPrompt,
      originalInstruction: taskInstruction,
    });

    const injection = applyCompiledTaskPromptToKinInput({
      compiledTaskPrompt: started.compiledTaskPrompt,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
    });
    setGptInput("");
    appendCurrentTaskInfoMessage(
      setGptMessages,
      injection.partCount > 1
        ? `Current task content was converted into a formal Kin task and split into ${injection.partCount} Kin parts. TASK_ID: #${started.taskId}`
        : `Current task content was converted into a formal Kin task and set to Kin input. TASK_ID: #${started.taskId}`
    );
    flushTaskUsage();
    setActiveTabToKin?.();
    return;
  }

  if (shouldTransformContent(intent)) {
    setGptLoading(true);
    try {
      const transformed = await transformTextWithIntent({
        text: content,
        intent,
        responseMode,
      });
      content = transformed.text.trim() || content;
      addTaskUsage(transformed.usage);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "Transforming the current task for Kin failed. The original text is kept.",
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
          taskSlot: currentTaskSlot,
          title: currentTaskTitle || "Current task",
          content,
          directiveLines,
        })
      : buildKinSysTaskBlock({
          taskSlot: currentTaskSlot,
          title: currentTaskTitle || "Current task",
          content,
          directiveLines,
        });

  setKinInput(block);
  setGptInput("");
  appendCurrentTaskInfoMessage(
    setGptMessages,
    `Current task content was set to Kin input as <<SYS_INFO>>. TASK_SLOT: ${getTaskSlotLabel()}`
  );
  flushTaskUsage();
  setActiveTabToKin?.();
}

