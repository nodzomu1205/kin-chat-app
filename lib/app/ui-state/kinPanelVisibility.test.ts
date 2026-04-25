import { describe, expect, it } from "vitest";
import {
  createInitialKinPanelVisibility,
  getKinLoadingText,
  getKinPendingInjectionLabel,
  resolveKinPanelVisibility,
  shouldShowKinManagementDrawer,
  toggleKinPanelConnectVisibility,
  toggleKinPanelListVisibility,
} from "@/lib/app/ui-state/kinPanelVisibility";

describe("kinPanelVisibility", () => {
  it("opens both drawers by default on desktop", () => {
    expect(
      createInitialKinPanelVisibility({
        isMobile: false,
        kinCount: 3,
      })
    ).toEqual({
      showKinList: true,
      showConnectForm: true,
    });
  });

  it("starts with both drawers closed on mobile when Kin profiles exist", () => {
    expect(
      createInitialKinPanelVisibility({
        isMobile: true,
        kinCount: 2,
      })
    ).toEqual({
      showKinList: false,
      showConnectForm: false,
    });
  });

  it("forces the connect form open on mobile when no Kin profile exists", () => {
    const state = createInitialKinPanelVisibility({
      isMobile: true,
      kinCount: 0,
    });

    expect(
      resolveKinPanelVisibility(state, {
        isMobile: true,
        kinCount: 0,
      })
    ).toEqual({
      showKinList: false,
      showConnectForm: true,
    });

    expect(
      toggleKinPanelConnectVisibility(state, {
        isMobile: true,
        kinCount: 0,
      })
    ).toEqual({
      showKinList: false,
      showConnectForm: true,
    });
  });

  it("preserves desktop toggle state instead of forcing drawers open", () => {
    const initial = createInitialKinPanelVisibility({
      isMobile: false,
      kinCount: 1,
    });
    const toggled = toggleKinPanelConnectVisibility(
      toggleKinPanelListVisibility(initial),
      {
        isMobile: false,
        kinCount: 1,
      }
    );

    expect(
      resolveKinPanelVisibility(toggled, {
        isMobile: false,
        kinCount: 1,
      })
    ).toEqual({
      showKinList: false,
      showConnectForm: false,
    });
  });

  it("derives the management drawer visibility from either drawer state", () => {
    expect(
      shouldShowKinManagementDrawer({
        showKinList: true,
        showConnectForm: false,
      })
    ).toBe(true);
    expect(
      shouldShowKinManagementDrawer({
        showKinList: false,
        showConnectForm: false,
      })
    ).toBe(false);
  });

  it("returns stable loading and pending-injection labels", () => {
    expect(getKinLoadingText(true)).toBe("Kindroidが応答中...");
    expect(getKinLoadingText(false)).toBeNull();
    expect(
      getKinPendingInjectionLabel({
        currentPart: 2,
        totalParts: 5,
      })
    ).toBe("注入送信中 2/5");
  });
});
