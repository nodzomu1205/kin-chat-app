import type { GptInstructionMode } from "@/components/panels/gpt/gptPanelTypes";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type {
  BucketUsageOptions,
  ConversationUsageOptions,
} from "@/lib/shared/tokenStats";
import type { Memory } from "@/lib/memory-domain/memory";
import type { Message } from "@/types/chat";
import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { TaskProtocolEvent, TaskRuntimeState } from "@/types/taskProtocol";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import type {
  ParsedInputLike,
  PendingRequestLike,
  ProtocolLimitEvent,
  SearchContextRecorder,
  WrappedSearchResponse,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";

export type MemoryResultLike = {
  compressionUsage?: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0];
  fallbackUsage?: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0];
  fallbackUsageDetails?: Record<string, unknown> | null;
  fallbackMetrics?: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  fallbackDebug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
};

export type SendToGptFlowSearchArgs = {
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  autoGenerateSearchLibrarySummary?: boolean;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  recordSearchContext: SearchContextRecorder;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
  applySearchUsage: (usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0]) => void;
  applyChatUsage: (
    usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
};

export type SendToGptFlowProtocolArgs = {
  taskProtocolRuntime: TaskRuntimeState;
  currentTaskId: string | null;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  getProtocolLimitViolation: (event: ProtocolLimitEvent) => string | null;
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  buildLibraryReferenceContext: () => string;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
};

export type SendToGptFlowMemoryArgs = {
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<MemoryResultLike>;
  applyCompressionUsage: (usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0]) => void;
  applyIngestUsage?: (usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0]) => void;
  applyImageUsage?: (usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0]) => void;
  imageLibraryImportEnabled?: boolean;
  imageLibraryImportMode?: import("@/components/panels/gpt/gptPanelTypes").ImageLibraryImportMode;
  imageDescriptionIngestOptions?: import("@/lib/app/ingest/ingestClient").SharedIngestOptions;
  applyTaskUsage: (
    usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  chatRecentLimit: number;
  gptStateRef: MutableRefObject<{ recentMessages?: Message[]; memory?: Memory }>;
};

export type SendToGptFlowUiArgs = {
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setPendingKinInjectionPurpose?: Dispatch<
    SetStateAction<PendingKinInjectionPurpose>
  >;
  setActiveTabToKin?: () => void;
};

export type SendToGptFlowRequestArgs = {
  gptInput: string;
  gptLoading: boolean;
  instructionMode?: GptInstructionMode;
  reasoningMode: ReasoningMode;
  autoGenerateLibrarySummary: boolean;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  currentTaskCharConstraint?: TaskCharConstraint;
  recordIngestedDocument: (document: {
    artifactType?: import("@/types/chat").StoredDocument["artifactType"];
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    structuredPayload?: import("@/types/chat").StoredDocument["structuredPayload"];
    createdAt: string;
    updatedAt: string;
  }) => { id: string };
  updateStoredDocument: (
    documentId: string,
    patch: Partial<Pick<StoredDocument, "title" | "text" | "summary" | "structuredPayload">>
  ) => void | null;
  onHandleYoutubeTranscriptRequest?: (params: {
    userMessage: Message;
    youtubeTranscriptRequestEvent: TaskProtocolEvent;
    currentTaskId: string | null;
  }) => Promise<boolean>;
};

export type RunSendToGptFlowArgs = SendToGptFlowRequestArgs &
  SendToGptFlowSearchArgs &
  SendToGptFlowProtocolArgs &
  SendToGptFlowMemoryArgs &
  SendToGptFlowUiArgs;
