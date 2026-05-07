import { describe, expect, it } from "vitest";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";

describe("parsePptCommand", () => {
  it("does not route new draft requests through the legacy /ppt draft flow", () => {
    const parsed = parsePptCommand("/ppt\nCreate a cotton supply chain deck");

    expect(parsed).toMatchObject({
      isPptCommand: true,
      body: "Create a cotton supply chain deck",
    });
    expect(parsed.intent).toBeUndefined();
  });

  it("detects the two-stage presentation menu commands", () => {
    expect(parsePptCommand("/ppt\nDocument ID: ppt_123\nSave")).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      intent: "savePlan",
      body: "Save",
    });
    expect(
      parsePptCommand("/ppt\nDocument ID: ppt_123\nResolve visual blocks")
    ).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      intent: "resolveVisuals",
      body: "Resolve visual blocks",
    });
    expect(
      parsePptCommand("/ppt\nDocument ID: ppt_123\nSave and create PPT")
    ).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      intent: "renderPptx",
      body: "Save and create PPT",
    });
  });

  it("keeps direct render requests on the render path", () => {
    expect(
      parsePptCommand("/ppt\nDocument ID: ppt_123\nCreate PPT")
    ).toMatchObject({
      documentId: "ppt_123",
      intent: "renderPptx",
      body: "Create PPT",
    });
  });

  it("does not revive removed image-mode commands", () => {
    expect(
      parsePptCommand(
        "/ppt\nDocument ID: ppt_123\nImages: on, library\nCreate PPT"
      )
    ).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      intent: undefined,
    });
  });

  it("does not route arbitrary document-scoped text through removed edit commands", () => {
    expect(
      parsePptCommand("/ppt\nDocument ID: ppt_123\nMake slide 3 richer")
    ).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      body: "Make slide 3 richer",
      intent: undefined,
    });
  });

  it("parses density metadata without creating an edit intent", () => {
    const parsed = parsePptCommand(
      "/ppt\nDocument ID: ppt_123\nDensity: DENSE\nMake it richer"
    );

    expect(parsed).toMatchObject({
      isPptCommand: true,
      documentId: "ppt_123",
      density: "dense",
      body: "Make it richer",
      intent: undefined,
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
