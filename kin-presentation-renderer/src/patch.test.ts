import { describe, expect, it } from "vitest";
import { applyPresentationPatch, presentationPatchSchema } from "./patch.js";
import type { PresentationSpec } from "./schema.js";

const baseSpec: PresentationSpec = {
  version: "0.1",
  title: "Original",
  theme: "business-clean",
  slides: [
    {
      type: "title",
      title: "Opening"
    },
    {
      type: "bullets",
      title: "Body",
      bullets: [{ text: "First point" }]
    }
  ]
};

describe("presentation patch", () => {
  it("updates deck metadata and a single slide", () => {
    const patched = applyPresentationPatch(baseSpec, {
      version: "0.1",
      operations: [
        {
          op: "updateDeck",
          title: "Updated",
          theme: "warm-minimal"
        },
        {
          op: "updateSlide",
          slideNumber: 2,
          patch: {
            title: "Updated Body",
            takeaway: "Clear next step."
          }
        }
      ]
    });

    expect(patched.title).toBe("Updated");
    expect(patched.theme).toBe("warm-minimal");
    expect(patched.slides[1].title).toBe("Updated Body");
    expect(patched.slides[1]).toMatchObject({ takeaway: "Clear next step." });
  });

  it("inserts, moves, and deletes slides", () => {
    const patched = applyPresentationPatch(baseSpec, {
      version: "0.1",
      operations: [
        {
          op: "insertSlide",
          afterSlideNumber: 1,
          slide: {
            type: "section",
            title: "Inserted"
          }
        },
        {
          op: "moveSlide",
          fromSlideNumber: 3,
          toSlideNumber: 2
        },
        {
          op: "deleteSlide",
          slideNumber: 3
        }
      ]
    });

    expect(patched.slides).toHaveLength(2);
    expect(patched.slides[1].title).toBe("Body");
  });

  it("rejects invalid slide updates after merging", () => {
    expect(() =>
      applyPresentationPatch(baseSpec, {
        version: "0.1",
        operations: [
          {
            op: "updateSlide",
            slideNumber: 2,
            patch: {
              bullets: []
            }
          }
        ]
      })
    ).toThrow();
  });

  it("validates patch shape", () => {
    const result = presentationPatchSchema.safeParse({
      version: "0.1",
      operations: [
        {
          op: "deleteSlide",
          slideNumber: 0
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
