import { describe, expect, it } from "vitest";
import {
  buildGeneratedImageDisplayText,
  formatImageFileSizeKb,
} from "@/lib/app/image/imageDisplayText";

describe("imageDisplayText", () => {
  it("formats imported image file sizes in KB", () => {
    expect(formatImageFileSizeKb(1788556)).toBe("1 788.6 KB");
  });

  it("uses formatted KB file size in image library text", () => {
    expect(
      buildGeneratedImageDisplayText({
        payload: {
          imageId: "img_1",
          fileName: "spinning.png",
          fileSize: 1788556,
          originalMimeType: "image/png",
          prompt: "Imported image file: spinning.png",
        },
      })
    ).toContain("File size: 1 788.6 KB");
  });
});
