import { generateId } from "@/lib/shared/uuid";
import { addUsage, emptyUsage, normalizeUsage } from "@/lib/shared/tokenStats";
import type { BucketUsageOptions } from "@/lib/shared/tokenStats";
import type { Message } from "@/types/chat";

export function createTaskUsageAccumulator(
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void
) {
  let accumulatedTaskUsage = emptyUsage();

  return {
    add(usage: Parameters<typeof normalizeUsage>[0]) {
      accumulatedTaskUsage = addUsage(accumulatedTaskUsage, normalizeUsage(usage));
    },
    flush() {
      applyTaskUsage(accumulatedTaskUsage);
    },
  };
}

export function appendKinTransferInfoMessage(args: {
  setGptMessages: (updater: (prev: Message[]) => Message[]) => void;
  text: string;
  sourceType?: NonNullable<Message["meta"]>["sourceType"];
}) {
  args.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: args.text,
      meta: {
        kind: "task_info",
        sourceType: args.sourceType || "manual",
      },
    },
  ]);
}

export function buildKinTaskInjectionStatusText(args: {
  subject: "Latest GPT content" | "Current instruction" | "Current task content";
  taskId: string;
  partCount: number;
}) {
  return args.partCount > 1
    ? `${args.subject} was converted into a formal Kin task and split into ${args.partCount} Kin parts. TASK_ID: #${args.taskId}`
    : `${args.subject} was converted into a formal Kin task and set to Kin input. TASK_ID: #${args.taskId}`;
}
