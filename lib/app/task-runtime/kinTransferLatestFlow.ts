import { buildKinSysInfoBlock } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/task-support/kinTaskInjection";
import { findLatestTransferableGptMessage } from "@/lib/app/task-support/latestGptMessage";
import { buildKinDirectiveLines } from "@/lib/app/task-runtime/transformIntent";
import {
  appendKinTransferInfoMessage,
  buildKinTaskInjectionStatusText,
  createTaskUsageAccumulator,
} from "@/lib/app/task-runtime/kinTransferFlowBuilders";
import type { SendLatestGptContentToKinArgs } from "@/lib/app/task-runtime/kinTransferFlowTypes";

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
  reasoningMode,
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
  const taskUsage = createTaskUsageAccumulator(applyTaskUsage);

  const last = findLatestTransferableGptMessage(gptMessages);

  if (!last) {
    setGptMessages((prev) => [
      ...prev,
      {
        id: `kin-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "gpt",
        text: "No recent GPT response was found to send to Kin.",
      },
    ]);
    return;
  }

  setGptLoading(true);
  try {
    const directiveText = gptInput.trim();
    const { intent, usage } = await resolveTransformIntent({
      input: directiveText,
      defaultMode: "sys_info",
      reasoningMode,
    });
    taskUsage.add(usage);

    let content = last.text.trim();

    if (intent.mode === "sys_task") {
      const resolved = await resolveTaskIntent({
        input: directiveText || content,
        approvedPhrases: approvedIntentPhrases,
        reasoningMode,
      });
      taskUsage.add(resolved.usage);
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
      appendKinTransferInfoMessage({
        setGptMessages,
        sourceType: "gpt_chat",
        text: buildKinTaskInjectionStatusText({
          subject: "Latest GPT content",
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
    const block = buildKinSysInfoBlock({
      taskSlot: currentTaskSlot,
      title: currentTaskTitle || "Latest GPT response",
      content,
      directiveLines,
    });

    setKinInput(block);
    setGptInput("");
    appendKinTransferInfoMessage({
      setGptMessages,
      sourceType: "gpt_chat",
      text: `Latest GPT content was set to Kin input as <<SYS_INFO>>. TASK_SLOT: ${getTaskSlotLabel()}`,
    });
    taskUsage.flush();
    setActiveTabToKin?.();
  } catch (error) {
    console.error(error);
    setGptMessages((prev) => [
      ...prev,
      {
        id: `kin-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "gpt",
        text: "Preparing the latest GPT content for Kin failed.",
      },
    ]);
  } finally {
    setGptLoading(false);
  }
}
