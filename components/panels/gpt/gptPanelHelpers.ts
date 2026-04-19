import type { SetStateAction } from "react";
import { CHAT_TEXTAREA_TEXT } from "@/components/ui/commonUiText";
import type { DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import type {
  GptPanelSettingsProps,
  GptPanelTaskProps,
} from "@/components/panels/gpt/gptPanelTypes";

export type BottomTabKey =
  | "chat"
  | "task_primary"
  | "task_secondary"
  | "kin";

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

const GPT_PANEL_HELPERS_TEXT = {
  topic: "トピック",
  task: "タスク",
  taskPrimary: "タスク作成ボタン使用中。解決したいタスク内容を入力",
  taskSecondary:
    "タスク作成ボタン使用中。タスク更新に関する質問や追加データを入力",
  kin: "タスク作成ボタン使用中。Kin へ送る質問を入力",
  file: "タスク作成ボタン使用中。ファイル分析や画像解析の追加指示を入力",
} as const;

export function toLocalSettings(
  props: Pick<GptPanelSettingsProps, "memorySettings" | "defaultMemorySettings">
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
      props.memorySettings.recentKeep ??
        props.defaultMemorySettings.recentKeep ??
        0
    ),
  };
}

export function toPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function buildLocalSettingsSourceKey(
  props: Pick<
    GptPanelSettingsProps,
    "memorySettings" | "defaultMemorySettings"
  > & {
    currentKin: string | null;
  }
) {
  return JSON.stringify({
    currentKin: props.currentKin,
    memorySettings: props.memorySettings,
    defaultMemorySettings: props.defaultMemorySettings,
  });
}

export function resolveLocalSettingsState(args: {
  localSettingsState: LocalMemorySettingsInput;
  localSettingsSourceKey: string;
  settingsSourceKey: string;
  sourceLocalSettings: LocalMemorySettingsInput;
}) {
  if (args.localSettingsSourceKey === args.settingsSourceKey) {
    return args.localSettingsState;
  }
  return args.sourceLocalSettings;
}

export function applyLocalSettingsUpdate(args: {
  value: SetStateAction<LocalMemorySettingsInput>;
  localSettingsState: LocalMemorySettingsInput;
  localSettingsSourceKey: string;
  settingsSourceKey: string;
  sourceLocalSettings: LocalMemorySettingsInput;
}) {
  const baseState =
    args.localSettingsSourceKey === args.settingsSourceKey
      ? args.localSettingsState
      : args.sourceLocalSettings;

  if (typeof args.value === "function") {
    return (
      args.value as (prevState: LocalMemorySettingsInput) => LocalMemorySettingsInput
    )(baseState);
  }

  return args.value;
}

export function resolveFloatingLabel(args: {
  activeDrawer: DrawerMode;
  bottomTab: BottomTabKey;
  currentTaskDraft: GptPanelTaskProps["currentTaskDraft"];
  currentTopic?: string;
}): FloatingLabel {
  const taskName =
    args.currentTaskDraft.title?.trim() ||
    args.currentTaskDraft.taskName?.trim() ||
    "";
  const currentTopic = args.currentTopic?.trim() || "";
  const taskFocused =
    args.bottomTab === "task_primary" ||
    args.bottomTab === "task_secondary" ||
    args.activeDrawer === "task";

  if (!taskFocused && currentTopic) {
    return {
      kind: GPT_PANEL_HELPERS_TEXT.topic,
      value: currentTopic,
      updatedAt: "",
      accent: "#0f766e",
      chipBg: "#ecfeff",
    };
  }

  if (taskFocused && taskName) {
    return {
      kind: GPT_PANEL_HELPERS_TEXT.task,
      value: taskName,
      updatedAt: args.currentTaskDraft.updatedAt || "",
      accent: "#b45309",
      chipBg: "#fff7ed",
    };
  }

  if (currentTopic) {
    return {
      kind: GPT_PANEL_HELPERS_TEXT.topic,
      value: currentTopic,
      updatedAt: "",
      accent: "#0f766e",
      chipBg: "#ecfeff",
    };
  }

  if (taskName) {
    return {
      kind: GPT_PANEL_HELPERS_TEXT.task,
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
  if (bottomTab === "chat") return CHAT_TEXTAREA_TEXT.placeholder;
  if (bottomTab === "task_primary") {
    return GPT_PANEL_HELPERS_TEXT.taskPrimary;
  }
  if (bottomTab === "task_secondary") {
    return GPT_PANEL_HELPERS_TEXT.taskSecondary;
  }
  if (bottomTab === "kin") {
    return GPT_PANEL_HELPERS_TEXT.kin;
  }
  return CHAT_TEXTAREA_TEXT.placeholder;
}


