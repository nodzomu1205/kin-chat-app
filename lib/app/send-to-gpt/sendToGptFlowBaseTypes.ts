import type { Message, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export type ParsedInputLike = {
  searchQuery?: string;
  freeText?: string;
  title?: string;
  userInstruction?: string;
};

export type PendingRequestLike = {
  id: string;
  taskId: string;
  actionId: string;
  body: string;
};

export type WrappedSearchResponse = {
  query?: string;
  outputMode?: string;
  summary?: string;
  rawExcerpt?: string;
} | null;

export type SearchRecord = {
  rawResultId: string;
};

export type ProtocolLimitEvent = {
  type:
    | "ask_gpt"
    | "search_request"
    | "user_question"
    | "library_reference"
    | "youtube_transcript_request";
  taskId?: string;
  actionId?: string;
};

export type ProtocolTaskEventLike = {
  taskId?: string;
  actionId?: string;
  body?: string;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: string;
};

export type SearchResponseEventLike = {
  taskId?: string;
  actionId?: string;
  body?: string;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: string;
};

export type GptStateSnapshotLike = {
  recentMessages?: Message[];
  memory?: {
    context?: {
      currentTopic?: string;
    };
  };
};

export type SearchContextRecorder = (args: {
  mode?: SearchMode;
  engines?: SearchEngine[];
  location?: string;
  seriesId?: string;
  continuationToken?: string;
  metadata?: Record<string, unknown>;
  taskId?: string;
  actionId?: string;
  query: string;
  goal?: string;
  outputMode?: "summary" | "raw_and_summary";
  summaryText?: string;
  rawText: string;
  sources: SourceItem[];
}) => SearchRecord;
