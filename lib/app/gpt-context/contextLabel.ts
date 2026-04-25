import type { TaskDraft } from "@/types/task";

type GptTopDrawerTab = "memory" | "tokens" | "settings" | "task_status" | null;
type GptBottomTab = "chat" | "task_primary" | "task_secondary" | "kin" | "file";

function formatContextUpdatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveContextLine(args: {
  activeDrawerTab: GptTopDrawerTab;
  activeBottomTab: GptBottomTab;
  currentTopic?: string;
  currentTaskDraft: TaskDraft;
}) {
  const taskName =
    args.currentTaskDraft.title?.trim() ||
    args.currentTaskDraft.taskName?.trim() ||
    "";

  const currentTopic = args.currentTopic?.trim() || "";

  const hasTask =
    !!args.currentTaskDraft.body.trim() ||
    !!args.currentTaskDraft.prepText.trim() ||
    !!args.currentTaskDraft.deepenText.trim() ||
    !!args.currentTaskDraft.mergedText.trim() ||
    args.currentTaskDraft.sources.length > 0;

  const taskFocused =
    args.activeDrawerTab === "task_status" ||
    args.activeBottomTab === "task_primary" ||
    args.activeBottomTab === "task_secondary";

  const kind: "task" | "chat" | null =
    taskFocused && taskName && hasTask
      ? "task"
      : currentTopic
        ? "chat"
        : taskName && hasTask
          ? "task"
          : null;

  const label =
    kind === "task" ? taskName : kind === "chat" ? currentTopic : "";

  return {
    contextKind: kind,
    contextLabel: label,
    contextUpdatedAt:
      kind === "task"
        ? formatContextUpdatedAt(args.currentTaskDraft.updatedAt)
        : "",
    showContextLine: !!label,
  };
}