import { generateId } from "@/lib/shared/uuid";
import type { LibraryReferenceMode } from "@/components/panels/gpt/gptPanelTypes";
import type { TaskDraft } from "@/types/task";
import type { TaskIntent } from "@/types/taskProtocol";

export type TaskRegistrationLibrarySettings = {
  enabled: boolean;
  mode: LibraryReferenceMode;
  count: number;
};

export const TASK_REGISTRATION_LIBRARY_COUNT_MAX = 50;

export function normalizeTaskRegistrationLibraryCountInput(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");

  if (!digits) {
    return {
      displayValue: "",
      count: null,
    };
  }

  const parsedCount = Number.parseInt(digits, 10);
  const count = Math.min(
    TASK_REGISTRATION_LIBRARY_COUNT_MAX,
    Math.max(0, Number.isFinite(parsedCount) ? parsedCount : 0)
  );

  return {
    displayValue: String(count),
    count,
  };
}

export type TaskRegistrationRecurrence = {
  mode: "single" | "repeat";
  weekdays: string[];
  times: string[];
};

export type RegisteredTask = {
  id: string;
  originalInstruction: string;
  registeredAt: string;
  draft: TaskDraft;
  intent?: TaskIntent;
  librarySettings: TaskRegistrationLibrarySettings;
  recurrence: TaskRegistrationRecurrence;
};

export function createDefaultTaskRegistrationLibrarySettings(): TaskRegistrationLibrarySettings {
  return {
    enabled: true,
    mode: "summary_only",
    count: 3,
  };
}

export function createDefaultTaskRegistrationRecurrence(): TaskRegistrationRecurrence {
  return {
    mode: "single",
    weekdays: [],
    times: ["09:00"],
  };
}

export function canRegisterTaskDraft(draft: TaskDraft) {
  return Boolean((draft.kinTaskText || draft.body).trim());
}

export function buildRegisteredTask(params: {
  draft: TaskDraft;
  intent?: TaskIntent;
  librarySettings: TaskRegistrationLibrarySettings;
  recurrence: TaskRegistrationRecurrence;
  now?: string;
}): RegisteredTask {
  return {
    id: generateId(),
    originalInstruction:
      params.draft.userInstruction.trim() ||
      params.draft.objective.trim() ||
      params.draft.title.trim() ||
      "Untitled task",
    registeredAt: params.now || new Date().toISOString(),
    draft: {
      ...params.draft,
      updatedAt: params.draft.updatedAt || new Date().toISOString(),
    },
    intent: params.intent,
    librarySettings: { ...params.librarySettings },
    recurrence: {
      ...params.recurrence,
      weekdays: [...params.recurrence.weekdays],
      times: [...params.recurrence.times],
    },
  };
}

export function updateRegisteredTask(
  task: RegisteredTask,
  params: {
    draft: TaskDraft;
    intent?: TaskIntent;
    librarySettings: TaskRegistrationLibrarySettings;
    recurrence: TaskRegistrationRecurrence;
    now?: string;
  }
): RegisteredTask {
  return {
    ...buildRegisteredTask(params),
    id: task.id,
    registeredAt: params.now || new Date().toISOString(),
  };
}

export function removeRegisteredTask(
  tasks: RegisteredTask[],
  taskId: string
) {
  return tasks.filter((task) => task.id !== taskId);
}
