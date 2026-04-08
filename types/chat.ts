import type { Memory } from "@/lib/memory";

export type SourceItem = {
  title: string;
  link: string;
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
