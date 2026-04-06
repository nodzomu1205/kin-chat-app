import type { Dispatch, RefObject, SetStateAction } from "react";
import type { MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";
import type { TaskDraft } from "@/types/task";
import type {
  TaskRequirementProgress,
  TaskExecutionStatus,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

export type GptInstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

export type ResponseMode = "strict" | "balanced" | "creative";
export type UploadKind = "auto" | "text" | "image" | "pdf" | "mixed";
export type IngestMode = "compact" | "detailed" | "max";
export type ImageDetail = "simple" | "detailed" | "max";
export type PostIngestAction =
  | "inject_only"
  | "inject_and_prep"
  | "inject_prep_deepen"
  | "attach_to_current_task";
export type FileReadPolicy = "text_first" | "visual_first" | "text_and_layout";

export type TokenTriplet = {
  input?: number;
  output?: number;
  total?: number;
};

export type TokenStats = {
  latestInput?: number;
  latestOutput?: number;
  latestTotal?: number;
  rolling5Input?: number;
  rolling5Output?: number;
  rolling5Total?: number;
  cumulativeInput?: number;
  cumulativeOutput?: number;
  cumulativeTotal?: number;
  latest?: TokenTriplet;
  rolling5?: TokenTriplet;
  cumulative?: TokenTriplet;
  [key: string]: unknown;
};

export type GptStateLike = {
  memory?: {
    facts?: string[];
    preferences?: string[];
    context?: {
      currentTopic?: string;
      currentTask?: string;
      followUpRule?: string;
      lastUserIntent?: string;
    };
  };
  recentMessages?: Message[];
};

export type TaskProgressView = {
  taskId: string | null;
  taskTitle: string;
  goal: string;
  taskStatus: TaskExecutionStatus;
  latestSummary: string;
  requirementProgress: TaskRequirementProgress[];
  userFacingRequests: UserFacingTaskRequest[];
};

export type GptPanelProps = {
  currentKin: string | null;
  currentKinLabel: string | null;
  kinStatus: string;
  gptState: GptStateLike;
  gptMessages: Message[];
  gptInput: string;
  setGptInput: Dispatch<SetStateAction<string>>;
  sendToGpt: (instructionMode?: GptInstructionMode) => void | Promise<void>;
  runPrepTaskFromInput: () => void | Promise<void>;
  runDeepenTaskFromLast: () => void | Promise<void>;
  runUpdateTaskFromInput: () => void | Promise<void>;
  runUpdateTaskFromLastGptMessage: () => void | Promise<void>;
  runAttachSearchResultToTask: () => void | Promise<void>;
  sendLatestGptContentToKin: () => void | Promise<void>;
  sendCurrentTaskContentToKin: () => void | Promise<void>;
  receiveLastKinResponseToGptInput: () => void | Promise<void>;
  resetGptForCurrentKin: () => void;
  sendLastGptToKinDraft: () => void | Promise<void>;
  injectFileToKinDraft: (
    file: File,
    options: {
      kind: UploadKind;
      mode: IngestMode;
      detail: ImageDetail;
      action: PostIngestAction;
      readPolicy: FileReadPolicy;
      compactCharLimit: number;
      simpleImageCharLimit: number;
    }
  ) => void | Promise<void>;
  canInjectFile: boolean;
  loading: boolean;
  ingestLoading: boolean;
  gptBottomRef: RefObject<HTMLDivElement | null>;
  memorySettings: MemorySettings;
  defaultMemorySettings: MemorySettings;
  onSaveMemorySettings: (next: MemorySettings) => void;
  onResetMemorySettings: () => void;
  tokenStats: TokenStats;
  responseMode: ResponseMode;
  onChangeResponseMode: (value: ResponseMode) => void;
  uploadKind: UploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  postIngestAction: PostIngestAction;
  fileReadPolicy: FileReadPolicy;
  onChangeUploadKind: (value: UploadKind) => void;
  onChangeIngestMode: (value: IngestMode) => void;
  onChangeImageDetail: (value: ImageDetail) => void;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeCompactCharLimit: (value: number) => void;
  onChangeSimpleImageCharLimit: (value: number) => void;
  onChangePostIngestAction: (value: PostIngestAction) => void;
  onChangeFileReadPolicy: (value: FileReadPolicy) => void;
  pendingInjectionCurrentPart: number;
  pendingInjectionTotalParts: number;
  onSwitchPanel: () => void;
  isMobile: boolean;
  currentTaskDraft: TaskDraft;
  onChangeTaskTitle: (value: string) => void;
  onChangeTaskUserInstruction: (value: string) => void;
  onChangeTaskBody: (value: string) => void;
  taskProgressView?: TaskProgressView;
  onAnswerTaskRequest?: (requestId: string) => void;
  onPrepareTaskRequestAck?: (requestId: string) => void;
  onPrepareTaskSync?: (note: string) => void;
  onStartKinTask?: () => void | Promise<void>;
};
