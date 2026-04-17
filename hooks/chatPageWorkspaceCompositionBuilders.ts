import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";
import type { ChatPageWorkspaceCompositionInput } from "@/hooks/chatPageWorkspaceCompositionTypes";

export function buildChatPageWorkspaceViewArgsWithRefs(args: {
  input: ChatPageWorkspaceCompositionInput;
  kinBottomRef: ChatPageWorkspaceViewArgs["ui"]["kinBottomRef"];
  gptBottomRef: ChatPageWorkspaceViewArgs["ui"]["gptBottomRef"];
}): ChatPageWorkspaceViewArgs {
  return {
    app: {
      ...args.input.state.app,
      ...args.input.actions.app,
    },
    ui: {
      ...args.input.state.ui,
      ...args.input.actions.ui,
      kinBottomRef: args.kinBottomRef,
      gptBottomRef: args.gptBottomRef,
    },
    task: {
      ...args.input.state.task,
      ...args.input.actions.task,
      ...args.input.services.task,
    },
    protocol: {
      ...args.input.state.protocol,
      ...args.input.actions.protocol,
      ...args.input.services.protocol,
    },
    search: {
      ...args.input.state.search,
      ...args.input.actions.search,
      ...args.input.services.search,
    },
    references: {
      ...args.input.state.references,
      ...args.input.actions.references,
      ...args.input.services.references,
    },
    gpt: {
      ...args.input.state.gpt,
      ...args.input.actions.gpt,
      ...args.input.services.gpt,
    },
    bridge: {
      ...args.input.state.bridge,
      ...args.input.actions.bridge,
    },
    memory: {
      ...args.input.state.memory,
      ...args.input.actions.memory,
    },
    usage: args.input.services.usage,
    kin: {
      ...args.input.state.kin,
      ...args.input.actions.kin,
    },
    reset: args.input.actions.reset,
  };
}
