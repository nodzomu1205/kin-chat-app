import { describe, expect, it } from "vitest";
import {
  buildPortableSidecarFileName,
  isPortableJsonSidecarName,
  isPortablePresentationPlanTextName,
  isPortableTextSidecarName,
  portableSidecarKey,
  sanitizePortableBaseName,
} from "@/lib/app/reference-library/portableSidecarNames";

describe("portableSidecarNames", () => {
  it("normalizes generated image and portable JSON sidecar names to the same key", () => {
    expect(portableSidecarKey("Deck [4,050chars].presentation-plan.json")).toBe(
      "deck"
    );
    expect(portableSidecarKey("Deck [4,050chars].txt")).toBe("deck");
    expect(portableSidecarKey("hero.generated-image.png")).toBe("hero");
    expect(portableSidecarKey("hero.generated-image.txt")).toBe("hero");
  });

  it("recognizes portable sidecar name shapes", () => {
    expect(isPortableTextSidecarName("deck.presentation-plan.json")).toBe(true);
    expect(isPortableJsonSidecarName("deck.search-context.json")).toBe(true);
    expect(isPortablePresentationPlanTextName("deck.md")).toBe(true);
    expect(isPortablePresentationPlanTextName("deck.json")).toBe(false);
  });

  it("builds sanitized portable sidecar filenames", () => {
    expect(sanitizePortableBaseName("bad:name.txt")).toBe("bad_name");
    expect(
      buildPortableSidecarFileName({
        filename: "Deck.txt",
        fallbackBaseName: "presentation-plan",
        marker: "presentation-plan",
      })
    ).toBe("Deck.presentation-plan.json");
  });
});
