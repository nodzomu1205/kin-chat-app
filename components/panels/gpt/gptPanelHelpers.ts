import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";
import type { DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import { normalizePromptTopic } from "@/lib/app/gptContextResolver";

export type BottomTabKey =
  | "chat"
  | "task_primary"
  | "task_secondary"
  | "kin"
  | "file";

export type FloatingLabel = {
  kind: string;
  value: string;
  updatedAt: string;
  accent: string;
  chipBg: string;
};

export type LocalMemorySettingsInput = {
  maxFacts: string;
  maxPreferences: string;
  chatRecentLimit: string;
  summarizeThreshold: string;
  recentKeep: string;
};

export function toLocalSettings(
  props: Pick<GptPanelProps, "memorySettings" | "defaultMemorySettings">
): LocalMemorySettingsInput {
  return {
    maxFacts: String(
      props.memorySettings.maxFacts ?? props.defaultMemorySettings.maxFacts ?? 0
    ),
    maxPreferences: String(
      props.memorySettings.maxPreferences ??
        props.defaultMemorySettings.maxPreferences ??
        0
    ),
    chatRecentLimit: String(
      props.memorySettings.chatRecentLimit ??
        props.defaultMemorySettings.chatRecentLimit ??
        0
    ),
    summarizeThreshold: String(
      props.memorySettings.summarizeThreshold ??
        props.defaultMemorySettings.summarizeThreshold ??
        0
    ),
    recentKeep: String(
      props.memorySettings.recentKeep ?? props.defaultMemorySettings.recentKeep ?? 0
    ),
  };
}

export function toPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function resolveFloatingLabel(args: {
  activeDrawer: DrawerMode;
  bottomTab: BottomTabKey;
  currentTaskDraft: GptPanelProps["currentTaskDraft"];
  currentTaskFromMemory?: string;
  currentTopic?: string;
  currentInput?: string;
  latestUserText?: string;
}): FloatingLabel {
  const taskName =
    args.currentTaskDraft.title?.trim() ||
    args.currentTaskDraft.taskName?.trim() ||
    args.currentTaskFromMemory?.trim() ||
    "";
  const liveTopic =
    normalizePromptTopic(args.currentInput || "") ||
    normalizePromptTopic(args.latestUserText || "");
  const topic = liveTopic || args.currentTopic?.trim() || "";
  const taskFocused =
    args.bottomTab === "task_primary" ||
    args.bottomTab === "task_secondary" ||
    args.activeDrawer === "task_draft" ||
    args.activeDrawer === "task_progress";

  if (taskFocused && taskName) {
    return {
      kind: "タスク",
      value: taskName,
      updatedAt: args.currentTaskDraft.updatedAt || "",
      accent: "#b45309",
      chipBg: "#fff7ed",
    };
  }

  if (args.bottomTab === "chat" && topic) {
    return {
      kind: "トピック",
      value: topic,
      updatedAt: "",
      accent: "#0f766e",
      chipBg: "#ecfeff",
    };
  }

  if (topic) {
    return {
      kind: "トピック",
      value: topic,
      updatedAt: "",
      accent: "#0f766e",
      chipBg: "#ecfeff",
    };
  }

  if (taskName) {
    return {
      kind: "タスク",
      value: taskName,
      updatedAt: args.currentTaskDraft.updatedAt || "",
      accent: "#b45309",
      chipBg: "#fff7ed",
    };
  }

  return {
    kind: "",
    value: "",
    updatedAt: "",
    accent: "#111827",
    chipBg: "transparent",
  };
}

export function getComposerPlaceholder(bottomTab: BottomTabKey) {
  if (bottomTab === "chat") return "メッセージを入力";
  if (bottomTab === "task_primary") {
    return "タスク形成ボタン使用時。新規タスク内容を入力";
  }
  if (bottomTab === "task_secondary") {
    return "タスク形成ボタン使用時。タスク整理に関する指示や追加データを入力";
  }
  if (bottomTab === "kin") {
    return "タスク形成ボタン使用時。Kinへの指示内容や条件を入力";
  }
  return "タスク形成ボタン使用時。ファイル取込時の指示や追加条件を入力";
}
