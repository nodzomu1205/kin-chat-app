import type {
  GptPanelChatProps,
  GptPanelHeaderProps,
  GptPanelProps,
  GptPanelProtocolProps,
  GptPanelReferenceProps,
  GptPanelSettingsProps,
  GptPanelTaskProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { TaskDraft } from "@/types/task";

type PendingInjectionState = {
  blocks: string[];
  index: number;
};

type UpdateTaskDraftFields = (patch: Partial<TaskDraft>) => void;

type BuildGptPanelChatArgs = Omit<GptPanelChatProps, "onInjectFile"> & {
  injectFileToKinDraft: GptPanelChatProps["onInjectFile"];
};

type BuildGptPanelTaskArgs = Omit<
  GptPanelTaskProps,
  | "pendingInjectionCurrentPart"
  | "pendingInjectionTotalParts"
  | "onChangeTaskTitle"
  | "onChangeTaskUserInstruction"
  | "onChangeTaskBody"
  | "onAnswerTaskRequest"
> & {
  pendingInjection: PendingInjectionState;
  updateTaskDraftFields: UpdateTaskDraftFields;
  pendingRequests: Array<{ id: string; actionId: string; body: string }>;
  buildTaskRequestAnswerDraft: (
    requestId: string,
    requestBody?: string | null
  ) => string;
};

type BuildGptPanelSettingsArgs = Omit<
  GptPanelSettingsProps,
  "currentTopic"
>;

export type BuildGptPanelArgs = {
  header: GptPanelHeaderProps;
  chat: BuildGptPanelChatArgs;
  task: BuildGptPanelTaskArgs;
  protocol: GptPanelProtocolProps;
  references: GptPanelReferenceProps;
  settings: BuildGptPanelSettingsArgs;
};

type BuiltGptPanelProps = GptPanelProps;

export function resolvePendingInjectionProgress({
  blocks,
  index,
}: PendingInjectionState) {
  return {
    currentPart: blocks.length > 0 ? index + 1 : 0,
    totalParts: blocks.length,
  };
}

export function clampPanelCount(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

export function buildGptPanelProps(args: BuildGptPanelArgs): BuiltGptPanelProps {
  const { header, chat, task, protocol, references, settings } = args;
  const pendingInjection = resolvePendingInjectionProgress(task.pendingInjection);
  const onChangeTaskTitle = (value: string) =>
    task.updateTaskDraftFields({
      title: value,
      taskName: value.trim() || task.currentTaskDraft.taskName,
    });
  const onChangeTaskUserInstruction = (value: string) =>
    task.updateTaskDraftFields({
      userInstruction: value,
    });
  const onChangeTaskBody = (value: string) =>
    task.updateTaskDraftFields({
      body: value,
      mergedText: value,
    });
  const onAnswerTaskRequest = (requestId: string) => {
    const request =
      task.pendingRequests.find(
        (item) => item.id === requestId || item.actionId === requestId
      ) || null;
    chat.setGptInput(task.buildTaskRequestAnswerDraft(requestId, request?.body));
  };
  const onChangeSourceDisplayCount = (value: number) =>
    settings.onChangeSourceDisplayCount(clampPanelCount(value, 1, 20));
  const onChangeLibraryIndexResponseCount = (value: number) =>
    settings.onChangeLibraryIndexResponseCount(clampPanelCount(value, 1, 50));
  const onChangeLibraryReferenceCount = (value: number) =>
    settings.onChangeLibraryReferenceCount(clampPanelCount(value, 0, 20));
  const onChangeImageLibraryReferenceCount = (value: number) =>
    settings.onChangeImageLibraryReferenceCount(clampPanelCount(value, 0, 50));
  const onChangeImageLibraryCardLimit = (value: number) =>
    settings.onChangeImageLibraryCardLimit(clampPanelCount(value, 0, 200));

  return {
    header,
    chat: {
      ...chat,
      onInjectFile: chat.injectFileToKinDraft,
    },
    task: {
      ...task,
      pendingInjectionCurrentPart: pendingInjection.currentPart,
      pendingInjectionTotalParts: pendingInjection.totalParts,
      onChangeTaskTitle,
      onChangeTaskUserInstruction,
      onChangeTaskBody,
      onAnswerTaskRequest,
    },
    protocol,
    references,
    settings: {
      ...settings,
      currentTopic: chat.gptState.memory?.context?.currentTopic,
      onChangeSourceDisplayCount,
      onChangeLibraryIndexResponseCount,
      onChangeLibraryReferenceCount,
      onChangeImageLibraryReferenceCount,
      onChangeImageLibraryCardLimit,
    },
  };
}
