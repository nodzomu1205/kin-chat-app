import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import type { Message } from "@/types/chat";

export type TaskMemoryBridgeArgs = {
  setGptState: Dispatch<SetStateAction<any>>;
  persistCurrentGptState?: (state: any) => void;
  gptStateRef: MutableRefObject<{ recentMessages?: Message[]; memory?: any }>;
  recentMessages?: Message[];
  topic?: string;
  taskTitle?: string;
  lastUserIntent?: string;
  activeReference?: {
    title: string;
    kind: string;
    sourceId?: string;
    excerpt?: string;
  } | null;
};

export function appendTaskInfoMessage(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  text: string,
  sourceType: Message["meta"] extends infer M
    ? M extends { sourceType?: infer S }
      ? S
      : never
    : never = "manual"
) {
  setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text,
      meta: {
        kind: "task_info",
        sourceType: sourceType as any,
      },
    },
  ]);
}

export function applyTaskMemoryBridge(args: TaskMemoryBridgeArgs) {
  const current = args.gptStateRef.current || {};
  const currentMemory = current.memory || {};
  const currentLists = currentMemory.lists || {};
  const nextLists = {
    ...currentLists,
    ...(args.activeReference
      ? {
          activeDocument: {
            title: args.activeReference.title,
            kind: args.activeReference.kind,
            sourceId: args.activeReference.sourceId,
            excerpt: args.activeReference.excerpt,
            importedAt: new Date().toISOString(),
          },
        }
      : {}),
  };

  const nextState = {
    ...current,
    ...(args.recentMessages ? { recentMessages: args.recentMessages } : {}),
    memory: {
      ...currentMemory,
      lists: nextLists,
      context: currentMemory.context || {},
    },
  };

  if (args.persistCurrentGptState) {
    args.persistCurrentGptState(nextState);
    return;
  }
  args.gptStateRef.current = nextState;
  args.setGptState(nextState);
}
