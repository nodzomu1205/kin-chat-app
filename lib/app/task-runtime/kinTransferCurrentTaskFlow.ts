import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from "@/lib/app/kin-protocol/kinStructuredProtocol";
import { applyKinSysInfoInjection } from "@/lib/app/kin-protocol/kinInfoInjection";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/task-support/kinTaskInjection";
import { buildKinDirectiveLines } from "@/lib/app/task-runtime/transformIntent";
import {
  appendKinTransferInfoMessage,
  buildKinTaskInjectionStatusText,
  createTaskUsageAccumulator,
} from "@/lib/app/task-runtime/kinTransferFlowBuilders";
import type { SendCurrentTaskContentToKinArgs } from "@/lib/app/task-runtime/kinTransferFlowTypes";

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
  reasoningMode,
  applyTaskUsage,
  shouldTransformContent,
  transformTextWithIntent,
  setGptLoading,
  setGptMessages,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setPendingKinInjectionPurpose,
  setKinInput,
  setGptInput,
  getTaskSlotLabel,
  setActiveTabToKin,
}: SendCurrentTaskContentToKinArgs) {
  const taskUsage = createTaskUsageAccumulator(applyTaskUsage);

  const rawDirective = gptInput.trim();

  if (rawDirective && looksLikeTaskInstruction(rawDirective)) {
    await runStartKinTaskFromInput();
    return;
  }

  setGptLoading(true);
  try {
    const sourceText = getTaskBaseText();
    const { intent, usage } = await resolveTransformIntent({
      input: rawDirective,
      defaultMode: "sys_task",
      reasoningMode,
    });
    taskUsage.add(usage);

    if (!sourceText && intent.mode === "sys_task" && rawDirective) {
      const resolved = await resolveTaskIntent({
        input: rawDirective,
        approvedPhrases: approvedIntentPhrases,
        reasoningMode,
      });
      taskUsage.add(resolved.usage);
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
        setPendingKinInjectionPurpose,
        setKinInput,
      });
      setGptInput("");
      appendKinTransferInfoMessage({
        setGptMessages,
        text: buildKinTaskInjectionStatusText({
          subject: "Current instruction",
          taskId: started.taskId,
          partCount: injection.partCount,
        }),
      });
      taskUsage.flush();
      setActiveTabToKin?.();
      return;
    }

    if (!sourceText) {
      appendKinTransferInfoMessage({
        setGptMessages,
        text: "No current task content was found to send to Kin.",
      });
      return;
    }

    let content = sourceText.trim();

    if (intent.mode === "sys_task") {
      const taskInstruction =
        rawDirective ||
        currentTaskInstruction?.trim() ||
        currentTaskTitle?.trim() ||
        content;
      const resolved = await resolveTaskIntent({
        input: taskInstruction,
        approvedPhrases: approvedIntentPhrases,
        reasoningMode,
      });
      taskUsage.add(resolved.usage);
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
        setPendingKinInjectionPurpose,
        setKinInput,
      });
      setGptInput("");
      appendKinTransferInfoMessage({
        setGptMessages,
        text: buildKinTaskInjectionStatusText({
          subject: "Current task content",
          taskId: started.taskId,
          partCount: injection.partCount,
        }),
      });
      taskUsage.flush();
      setActiveTabToKin?.();
      return;
    }

    if (shouldTransformContent(intent)) {
      const transformed = await transformTextWithIntent({
        text: content,
        intent,
        reasoningMode,
      });
      content = transformed.text.trim() || content;
      taskUsage.add(transformed.usage);
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

    if (intent.mode === "sys_info") {
      applyKinSysInfoInjection({
        text: block,
        setKinInput,
        setPendingKinInjectionBlocks,
        setPendingKinInjectionIndex,
        setPendingKinInjectionPurpose,
        purpose: "info_share",
      });
    } else {
      setPendingKinInjectionBlocks([]);
      setPendingKinInjectionIndex(0);
      setPendingKinInjectionPurpose?.("none");
      setKinInput(block);
    }
    setGptInput("");
    appendKinTransferInfoMessage({
      setGptMessages,
      text: `Current task content was set to Kin input as <<SYS_INFO>>. TASK_SLOT: ${getTaskSlotLabel()}`,
    });
    taskUsage.flush();
    setActiveTabToKin?.();
  } catch (error) {
    console.error(error);
    appendKinTransferInfoMessage({
      setGptMessages,
      text: "Preparing the current task for Kin failed.",
    });
  } finally {
    setGptLoading(false);
  }
}
