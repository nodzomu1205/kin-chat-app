import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";
import type { ChatPageWorkspaceCompositionInput } from "@/hooks/chatPageWorkspaceCompositionTypes";

export type ChatPageWorkspaceViewArgsWithoutRefs = Omit<
  ChatPageWorkspaceViewArgs,
  "ui"
> & {
  ui: Omit<ChatPageWorkspaceViewArgs["ui"], "kinBottomRef" | "gptBottomRef">;
};

export function buildChatPageWorkspaceViewArgs(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgsWithoutRefs {
  return {
    app: {
      ...input.state.app,
      ...input.actions.app,
    },
    ui: {
      ...input.state.ui,
      ...input.actions.ui,
    },
    task: {
      ...input.state.task,
      ...input.actions.task,
      ...input.services.task,
    },
    protocol: {
      ...input.state.protocol,
      ...input.actions.protocol,
      ...input.services.protocol,
    },
    search: {
      ...input.state.search,
      ...input.actions.search,
      ...input.services.search,
    },
    references: {
      ...input.state.references,
      ...input.actions.references,
      ...input.services.references,
    },
    gpt: {
      ...input.state.gpt,
      ...input.actions.gpt,
      ...input.services.gpt,
    },
    bridge: {
      ...input.state.bridge,
      ...input.actions.bridge,
    },
    memory: {
      ...input.state.memory,
      ...input.actions.memory,
    },
    usage: input.services.usage,
    kin: {
      ...input.state.kin,
      ...input.actions.kin,
    },
    reset: input.actions.reset,
  };
}
