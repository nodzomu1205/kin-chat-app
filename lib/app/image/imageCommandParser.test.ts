import { describe, expect, it } from "vitest";
import { parseImageCommand } from "@/lib/app/image/imageCommandParser";

describe("parseImageCommand", () => {
  it("detects standalone image creation", () => {
    expect(
      parseImageCommand("Create Image:\nコットン畑とサプライチェーンを表す図")
    ).toMatchObject({
      isImageCommand: true,
      intent: "createImage",
      body: "コットン畑とサプライチェーンを表す図",
    });
  });

  it("detects image revisions without /ppt", () => {
    expect(
      parseImageCommand("Image ID: img_abc123\n内容全体を画像のフレーム内に収めて")
    ).toMatchObject({
      isImageCommand: true,
      intent: "reviseImage",
      imageId: "img_abc123",
      body: "内容全体を画像のフレーム内に収めて",
    });
  });

  it("extracts Apply to as an image address", () => {
    expect(
      parseImageCommand(
        "Image ID: img_abc123\nApply to: Document ID ppt_1 / Slide 2 / block1\n余白を広くして"
      )
    ).toMatchObject({
      isImageCommand: true,
      intent: "reviseImage",
      imageId: "img_abc123",
      applyTo: "Document ID ppt_1 / Slide 2 / block1",
      body: "余白を広くして",
    });
  });
});
