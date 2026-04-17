import type { DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import type { SettingsWorkspaceView } from "@/components/panels/gpt/GptSettingsWorkspace";
import type { BottomTabKey } from "@/components/panels/gpt/gptPanelHelpers";

export type GptPanelViewState = {
  activeDrawer: DrawerMode;
  activeSettingsWorkspace: SettingsWorkspaceView | null;
  bottomTab: BottomTabKey;
};

export function createInitialGptPanelViewState(): GptPanelViewState {
  return {
    activeDrawer: null,
    activeSettingsWorkspace: null,
    bottomTab: "chat",
  };
}

export function changeGptDrawer(
  state: GptPanelViewState,
  next: DrawerMode
): GptPanelViewState {
  return {
    ...state,
    activeDrawer: next,
    activeSettingsWorkspace: null,
  };
}

export function toggleGptSettingsWorkspace(
  state: GptPanelViewState,
  next: SettingsWorkspaceView
): GptPanelViewState {
  return {
    ...state,
    activeDrawer: null,
    activeSettingsWorkspace:
      state.activeSettingsWorkspace === next ? null : next,
  };
}

export function changeGptBottomTab(
  state: GptPanelViewState,
  next: BottomTabKey
): GptPanelViewState {
  return {
    ...state,
    bottomTab: next,
  };
}

export function closeGptSettingsWorkspace(
  state: GptPanelViewState
): GptPanelViewState {
  return {
    ...state,
    activeSettingsWorkspace: null,
  };
}

export function shouldShowGptDrawer(state: GptPanelViewState) {
  return !!state.activeDrawer && !state.activeSettingsWorkspace;
}

export function shouldShowGptSettingsWorkspace(state: GptPanelViewState) {
  return !!state.activeSettingsWorkspace;
}

export function shouldShowGptChatBody(state: GptPanelViewState) {
  return !state.activeSettingsWorkspace;
}
