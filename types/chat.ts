import type { Memory } from "@/lib/memory";

export type SourceItem = {
  title: string;
  link: string;
};

export type Message = {
  id: string;
  role: "user" | "gpt" | "kin";
  text: string;
  sources?: SourceItem[];
};

export type KinMemoryState = {
  memory: Memory;
  recentMessages: Message[];
};

export type KinProfile = {
  id: string;
  label: string;
};