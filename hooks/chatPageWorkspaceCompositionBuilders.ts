import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";
import type { ChatPageWorkspaceCompositionInput } from "@/hooks/chatPageWorkspaceCompositionTypes";

function buildWorkspaceViewApp(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["app"] {
  return {
    ...input.state.app,
    ...input.actions.app,
  };
}

function buildWorkspaceViewUi(args: {
  input: ChatPageWorkspaceCompositionInput;
  kinBottomRef: ChatPageWorkspaceViewArgs["ui"]["kinBottomRef"];
  gptBottomRef: ChatPageWorkspaceViewArgs["ui"]["gptBottomRef"];
}): ChatPageWorkspaceViewArgs["ui"] {
  return {
    ...args.input.state.ui,
    ...args.input.actions.ui,
    kinBottomRef: args.kinBottomRef,
    gptBottomRef: args.gptBottomRef,
  };
}

function buildWorkspaceViewTask(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["task"] {
  return {
    ...input.state.task,
    ...input.actions.task,
    ...input.services.task,
  };
}

function buildWorkspaceViewProtocol(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["protocol"] {
  return {
    ...input.state.protocol,
    ...input.actions.protocol,
    ...input.services.protocol,
  };
}

function buildWorkspaceViewSearch(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["search"] {
  return {
    ...input.state.search,
    ...input.actions.search,
    ...input.services.search,
  };
}

function buildWorkspaceViewReferences(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["references"] {
  return {
    ...input.state.references,
    ...input.actions.references,
    ...input.services.references,
  };
}

function buildWorkspaceViewGpt(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["gpt"] {
  return {
    ...input.state.gpt,
    ...input.actions.gpt,
    ...input.services.gpt,
  };
}

function buildWorkspaceViewBridge(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["bridge"] {
  return {
    ...input.state.bridge,
    ...input.actions.bridge,
  };
}

function buildWorkspaceViewMemory(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["memory"] {
  return {
    ...input.state.memory,
    ...input.actions.memory,
  };
}

function buildWorkspaceViewKin(
  input: ChatPageWorkspaceCompositionInput
): ChatPageWorkspaceViewArgs["kin"] {
  return {
    ...input.state.kin,
    ...input.actions.kin,
  };
}

export function buildChatPageWorkspaceViewArgsWithRefs(args: {
  input: ChatPageWorkspaceCompositionInput;
  kinBottomRef: ChatPageWorkspaceViewArgs["ui"]["kinBottomRef"];
  gptBottomRef: ChatPageWorkspaceViewArgs["ui"]["gptBottomRef"];
}): ChatPageWorkspaceViewArgs {
  return {
    app: buildWorkspaceViewApp(args.input),
    ui: buildWorkspaceViewUi(args),
    task: buildWorkspaceViewTask(args.input),
    protocol: buildWorkspaceViewProtocol(args.input),
    search: buildWorkspaceViewSearch(args.input),
    references: buildWorkspaceViewReferences(args.input),
    gpt: buildWorkspaceViewGpt(args.input),
    bridge: buildWorkspaceViewBridge(args.input),
    memory: buildWorkspaceViewMemory(args.input),
    usage: args.input.services.usage,
    kin: buildWorkspaceViewKin(args.input),
    reset: args.input.actions.reset,
  };
}
