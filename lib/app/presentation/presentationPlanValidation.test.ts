import { describe, expect, it } from "vitest";
import { syncDeckFrameSlideCount } from "@/lib/app/presentation/presentationPlanValidation";

describe("presentationPlanValidation", () => {
  it("syncs deck frame slide count after frame normalization", () => {
    const synced = syncDeckFrameSlideCount(
      { slideCount: 5, masterFrameId: "titleLineFooter" },
      [
        {
          slideNumber: 1,
          title: "A",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "singleCenter",
          blocks: [
            { id: "block1", kind: "callout", styleId: "callout", text: "A" },
          ],
        },
        {
          slideNumber: 2,
          title: "B",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "singleCenter",
          blocks: [
            { id: "block1", kind: "callout", styleId: "callout", text: "B" },
          ],
        },
      ]
    );

    expect(synced?.slideCount).toBe(2);
  });
});
