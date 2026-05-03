import type { Message } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";
import type {
  ParsedInputLike,
  PendingRequestLike,
  ProtocolTaskEventLike,
  SearchResponseEventLike,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";

export type PreparedRequestGateContext = {
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
  limitViolation: string | null;
  userMsg: Message;
  youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
  pptDesignRequestEvent?: ProtocolTaskEventLike;
  fileSaveRequestEvent?: ProtocolTaskEventLike;
  libraryReferenceContext?: string;
  currentTaskCharConstraint?: TaskCharConstraint;
};

export type PreparedRequestExecutionContext = {
  finalRequestText: string;
  storedDocumentContext: string;
  storedLibraryContext: string;
  cleanQuery?: string;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveParsedSearchQuery: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  askGptEvent?: ProtocolTaskEventLike;
  draftPreparationRequestEvent?: ProtocolTaskEventLike;
  pptDesignRequestEvent?: ProtocolTaskEventLike;
  libraryImageDataRequestEvent?: ProtocolTaskEventLike;
  draftModificationRequestEvent?: ProtocolTaskEventLike;
  fileSaveRequestEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type PreparedRequestContextSource = PreparedRequestGateContext & {
  finalRequestText: string;
  effectiveDocumentReferenceContext: string;
  libraryReferenceContext: string;
  continuationDetails: {
    cleanQuery?: string;
  };
  searchRequestEvent?: SearchResponseEventLike;
  effectiveParsedSearchQuery: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  askGptEvent?: ProtocolTaskEventLike;
  draftPreparationRequestEvent?: ProtocolTaskEventLike;
  libraryImageDataRequestEvent?: ProtocolTaskEventLike;
  draftModificationRequestEvent?: ProtocolTaskEventLike;
  fileSaveRequestEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type PreparedRequestFinalizeContext = {
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  effectiveParsedSearchQuery: string;
  finalRequestText: string;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type TaskDirectiveOnlyGateContext = {
  isTaskDirectiveOnly: boolean;
};

export type ProtocolLimitViolationGateContext = {
  limitViolation: string | null;
  userMsg: Message;
};

export type YoutubeTranscriptGateContext = {
  youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
  userMsg: Message;
};

export type MultipartImportGateContext = {
  multipartHandled: boolean;
};

export type InlineUrlGateContext = {
  inlineUrlTarget: string | null;
};
