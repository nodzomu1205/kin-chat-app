import { describe, expect, it } from "vitest";
import {
  parsePptCommand,
  parsePptFrameCommand,
} from "@/lib/app/presentation/presentationCommandParser";

describe("parsePptCommand", () => {
  it("does not route new draft requests through the legacy /ppt draft flow", () => {
    const parsed = parsePptCommand("/ppt\nCreate a cotton supply chain deck");

    expect(parsed).toMatchObject({
      isPptCommand: true,
      body: "Create a cotton supply chain deck",
    });
    expect(parsed.intent).toBeUndefined();
  });

  it("routes document-scoped edits to direct PPTX revision", () => {
    const parsed = parsePptCommand(
      "/ppt\nDocument ID: ppt_123\nMake slide 3 richer"
    );

    expect(parsed).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      body: "Make slide 3 richer",
      intent: "reviseRenderedPptx",
    });
  });

  it("detects concise preview requests", () => {
    expect(parsePptCommand("/ppt\nDocument ID: ppt_123\npreview")).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      intent: "showPreview",
    });
  });

  it("detects render requests", () => {
    expect(
      parsePptCommand("/ppt\nDocument ID: ppt_123\nImages: on\nCreate PPT")
    ).toMatchObject({
      documentId: "ppt_123",
      intent: "renderPptx",
      generateImages: true,
      imageMode: "hybrid",
      body: "Create PPT",
    });
  });

  it("parses PPT image modes", () => {
    expect(parsePptCommand("/ppt\nImages: off\nCreate PPT")).toMatchObject({
      imageMode: "off",
      generateImages: false,
      body: "Create PPT",
    });
    expect(
      parsePptCommand("/ppt\nImages: on, library\nCreate PPT")
    ).toMatchObject({
      imageMode: "library",
      generateImages: true,
      body: "Create PPT",
    });
    expect(parsePptCommand("/ppt\nImages: on, API\nCreate PPT")).toMatchObject({
      imageMode: "api",
      generateImages: true,
      body: "Create PPT",
    });
    expect(
      parsePptCommand("/ppt\nImages: on, library, API\nCreate PPT")
    ).toMatchObject({
      imageMode: "hybrid",
      generateImages: true,
      body: "Create PPT",
    });
  });

  it("parses density metadata without reviving the legacy draft intent", () => {
    const createParsed = parsePptCommand(
      "/ppt\nDensity: Detailed\nCreate a cotton deck"
    );
    expect(createParsed).toMatchObject({
      isPptCommand: true,
      density: "detailed",
      body: "Create a cotton deck",
    });
    expect(createParsed.intent).toBeUndefined();

    const editParsed = parsePptCommand(
      "/ppt\nDocument ID: ppt_123\nDensity: DENSE\nMake it richer"
    );
    expect(editParsed).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      density: "dense",
      body: "Make it richer",
      intent: "reviseRenderedPptx",
    });
  });

  it("detects render requests even without a document id", () => {
    expect(parsePptCommand("/ppt Create PPT")).toMatchObject({
      isPptCommand: true,
      intent: "renderPptx",
      body: "Create PPT",
    });
  });

  it("ignores normal messages", () => {
    expect(parsePptCommand("normal message")).toMatchObject({
      isPptCommand: false,
      body: "normal message",
    });
  });
});

describe("parsePptFrameCommand", () => {
  it("detects frame index requests without requiring /ppt", () => {
    expect(parsePptFrameCommand("PPT frames: Show index")).toMatchObject({
      isFrameCommand: true,
      body: "Show index",
      intent: "showFrameIndex",
    });
  });

  it("detects frame JSON requests", () => {
    expect(
      parsePptFrameCommand("PPT frames: Show JSON / titleLineFooter")
    ).toMatchObject({
      isFrameCommand: true,
      body: "Show JSON / titleLineFooter",
      frameId: "titleLineFooter",
      intent: "showFrameJson",
    });
  });

  it("leaves unrelated input alone", () => {
    expect(parsePptFrameCommand("normal message")).toMatchObject({
      isFrameCommand: false,
      body: "normal message",
    });
  });
});
