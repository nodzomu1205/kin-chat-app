import { describe, expect, it } from "vitest";
import { presentationSpecSchema } from "./schema.js";

const baseSpec = {
  version: "0.1",
  title: "Test",
  slides: [
    {
      type: "title",
      title: "Opening"
    }
  ]
};

describe("presentationSpecSchema", () => {
  it("accepts a minimal valid presentation", () => {
    expect(presentationSpecSchema.parse(baseSpec).title).toBe("Test");
  });

  it("rejects unknown slide types", () => {
    const result = presentationSpecSchema.safeParse({
      ...baseSpec,
      slides: [{ type: "image", title: "Unsupported" }]
    });

    expect(result.success).toBe(false);
  });

  it("rejects table rows that do not match the column count", () => {
    const result = presentationSpecSchema.safeParse({
      ...baseSpec,
      slides: [
        {
          type: "table",
          title: "Bad Table",
          columns: ["A", "B"],
          rows: [["Only one cell"]]
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
