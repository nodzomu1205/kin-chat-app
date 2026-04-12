import type { Memory } from "@/lib/memory";

export type SourceItem = {
  title: string;
  link: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  videoId?: string;
};

export type MessageMeta = {
  kind?: "normal" | "task_prep" | "task_deepen" | "task_format" | "task_info";
  taskDraftId?: string;
  sourceType?:
    | "gpt_input"
    | "gpt_chat"
    | "file_ingest"
    | "search"
    | "manual"
    | "kin_message";
};

export type Message = {
  id: string;
  role: "user" | "gpt" | "kin";
  text: string;
  sources?: SourceItem[];
  meta?: MessageMeta;
};

export type KinMemoryState = {
  memory: Memory;
  recentMessages: Message[];
};

export type KinProfile = {
  id: string;
  label: string;
};

export type MultipartAssembly = {
  id: string;
  taskId?: string;
  status?: string;
  summary?: string;
  totalParts: number;
  parts: Array<{
    index: number;
    text: string;
  }>;
  assembledText: string;
  isComplete: boolean;
  updatedAt: string;
  filename: string;
};

export type StoredDocument = {
  id: string;
  sourceType: "kin_created" | "ingested_file";
  title: string;
  filename: string;
  text: string;
  summary?: string;
  taskId?: string;
  charCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceLibraryItem = {
  id: string;
  sourceId: string;
  itemType: "search" | "kin_created" | "ingested_file";
  title: string;
  subtitle: string;
  summary: string;
  excerptText: string;
  createdAt: string;
  updatedAt: string;
  filename?: string;
  taskId?: string;
  rawResultId?: string;
  sources?: SourceItem[];
  askAiModeItems?: Array<{
    question?: string;
    title?: string;
    snippet?: string;
    link?: string;
    serpapi_link?: string;
  }>;
  modeOverride?: "default" | "summary_only" | "summary_with_excerpt";
};
