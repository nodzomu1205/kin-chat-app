import { describe, expect, it } from "vitest";
import {
  CHAT_PAGE_MOBILE_BREAKPOINT,
  DEFAULT_CHAT_BRIDGE_SETTINGS,
  resolveCurrentKinDisplayLabel,
} from "@/lib/app/ui-state/chatPageDefaults";

describe("chatPageDefaults", () => {
  it("keeps the shared mobile breakpoint stable", () => {
    expect(CHAT_PAGE_MOBILE_BREAKPOINT).toBe(1180);
  });

  it("exposes the default bridge settings used by the chat page", () => {
    expect(DEFAULT_CHAT_BRIDGE_SETTINGS).toEqual({
      injectTaskContextOnReference: true,
      alwaysShowCurrentTaskInChatContext: false,
    });
  });

  it("resolves the current Kin display label", () => {
    expect(
      resolveCurrentKinDisplayLabel({
        currentKin: "kin-2",
        kinList: [
          { id: "kin-1", label: "One" },
          { id: "kin-2", label: "Two" },
        ],
      })
    ).toBe("Two");
  });
});
