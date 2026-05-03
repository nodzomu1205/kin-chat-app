import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { KinMemoryState, Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import {
  normalizeUsage,
  type BucketUsageOptions,
  type ConversationUsageOptions,
} from "@/lib/shared/tokenStats";

export type ParsedInputLike = {
  title?: string;
  userInstruction?: string;
  freeText?: string;
  searchQuery?: string;
};

type SetTaskDraft = Dispatch<SetStateAction<TaskDraft>>;

export type CommonTaskDraftFlowArgs = {
  gptLoading: boolean;
  currentTaskDraft: TaskDraft;
  getTaskBaseText: () => string;
  getTaskSearchContext: () => SearchContext | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setGptState: Dispatch<SetStateAction<KinMemoryState>>;
  persistCurrentGptState?: (state: KinMemoryState) => void;
  setCurrentTaskDraft: SetTaskDraft;
  gptStateRef: MutableRefObject<KinMemoryState>;
  chatRecentLimit: number;
  referenceLibraryItems: ReferenceLibraryItem[];
  buildLibraryReferenceContext: () => string;
  imageLibraryReferenceEnabled: boolean;
  imageLibraryReferenceCount: number;
  applyChatUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  applyCompressionUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  handleGptMemory: (
    recent: Message[],
    options?: {
      currentTaskTitleOverride?: string;
      lastUserIntent?: string;
      activeDocument?: Record<string, unknown> | null;
    }
  ) => Promise<{
    compressionUsage: Parameters<typeof normalizeUsage>[0] | null;
    fallbackUsage: Parameters<typeof normalizeUsage>[0] | null;
    fallbackUsageDetails: Record<string, unknown> | null;
    fallbackMetrics: {
      promptChars: number;
      rawReplyChars: number;
    } | null;
    fallbackDebug: {
      prompt: string;
      rawReply: string;
      parsed: unknown;
      usageDetails?: Record<string, unknown> | null;
    } | null;
  }>;
};

export type PrepTaskFromInputFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
};

export type UpdateTaskFromInputFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
};

export type UpdateTaskFromLastGptMessageFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
  gptMessages: Message[];
};

export type AttachSearchResultToTaskFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
  lastSearchContext: SearchContext | null;
  getTaskLibraryItem: () => ReferenceLibraryItem | null;
};

export type DeepenTaskFromLastFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
};

