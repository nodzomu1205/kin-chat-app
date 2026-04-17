import { describe, expect, it } from "vitest";
import {
  changeGptBottomTab,
  changeGptDrawer,
  closeGptSettingsWorkspace,
  createInitialGptPanelViewState,
  shouldShowGptChatBody,
  shouldShowGptDrawer,
  shouldShowGptSettingsWorkspace,
  toggleGptSettingsWorkspace,
} from "@/lib/app/gptPanelViewState";

describe("gptPanelViewState", () => {
  it("starts on the chat tab with drawer and settings workspace closed", () => {
    expect(createInitialGptPanelViewState()).toEqual({
      activeDrawer: null,
      activeSettingsWorkspace: null,
      bottomTab: "chat",
    });
  });

  it("closes the settings workspace when opening a drawer", () => {
    expect(
      changeGptDrawer(
        {
          activeDrawer: null,
          activeSettingsWorkspace: "chat",
          bottomTab: "chat",
        },
        "task"
      )
    ).toEqual({
      activeDrawer: "task",
      activeSettingsWorkspace: null,
      bottomTab: "chat",
    });
  });

  it("closes the drawer when toggling a settings workspace", () => {
    const opened = toggleGptSettingsWorkspace(
      {
        activeDrawer: "task",
        activeSettingsWorkspace: null,
        bottomTab: "chat",
      },
      "library"
    );

    expect(opened).toEqual({
      activeDrawer: null,
      activeSettingsWorkspace: "library",
      bottomTab: "chat",
    });

    expect(toggleGptSettingsWorkspace(opened, "library")).toEqual({
      activeDrawer: null,
      activeSettingsWorkspace: null,
      bottomTab: "chat",
    });
  });

  it("derives visibility from the shared view state", () => {
    const drawerState = changeGptDrawer(createInitialGptPanelViewState(), "task");
    expect(shouldShowGptDrawer(drawerState)).toBe(true);
    expect(shouldShowGptSettingsWorkspace(drawerState)).toBe(false);
    expect(shouldShowGptChatBody(drawerState)).toBe(true);

    const settingsState = toggleGptSettingsWorkspace(drawerState, "chat");
    expect(shouldShowGptDrawer(settingsState)).toBe(false);
    expect(shouldShowGptSettingsWorkspace(settingsState)).toBe(true);
    expect(shouldShowGptChatBody(settingsState)).toBe(false);
    expect(closeGptSettingsWorkspace(settingsState).activeSettingsWorkspace).toBe(
      null
    );
  });

  it("updates the bottom tab independently", () => {
    expect(
      changeGptBottomTab(createInitialGptPanelViewState(), "file").bottomTab
    ).toBe("file");
  });
});
