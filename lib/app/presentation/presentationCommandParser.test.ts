import { describe, expect, it } from "vitest";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";

describe("parsePptCommand", () => {
  it("detects new draft requests", () => {
    expect(
      parsePptCommand("/ppt\n部長層向けの提案プレゼンを10枚で作って")
    ).toMatchObject({
      isPptCommand: true,
      intent: "createDraft",
      body: "部長層向けの提案プレゼンを10枚で作って",
    });
  });

  it("detects document-scoped revisions", () => {
    expect(
      parsePptCommand(
        "/ppt\nDocument ID: pres_123\n3枚目の内容をもっとリッチにして"
      )
    ).toMatchObject({
      isPptCommand: true,
      documentId: "pres_123",
      intent: "reviseDraft",
      body: "3枚目の内容をもっとリッチにして",
    });
  });

  it("treats Japanese wording that includes 見せて as a revision when it has edit details", () => {
    expect(
      parsePptCommand(
        "/ppt\nDocument ID: pres_123\n消費者体験に力点を置いてもっとリッチな内容にして。ボックスやフローチャートを使って分かりやすく見せて。"
      )
    ).toMatchObject({
      isPptCommand: true,
      documentId: "pres_123",
      intent: "reviseDraft",
    });
  });

  it("detects concise preview requests", () => {
    expect(
      parsePptCommand("/ppt\nDocument ID: pres_123\nプレビュー")
    ).toMatchObject({
      isPptCommand: true,
      documentId: "pres_123",
      intent: "showPreview",
    });
  });

  it("detects render requests", () => {
    expect(
      parsePptCommand("/ppt\nDocument ID: pres_123\nCreate PPT")
    ).toMatchObject({
      documentId: "pres_123",
      intent: "renderPptx",
      body: "Create PPT",
    });
  });

  it("parses density metadata case-insensitively and removes it from the body", () => {
    expect(
      parsePptCommand("/ppt\nDensity: Detailed\n事業計画を10枚でまとめて")
    ).toMatchObject({
      isPptCommand: true,
      intent: "createDraft",
      density: "detailed",
      body: "事業計画を10枚でまとめて",
    });

    expect(
      parsePptCommand(
        "/ppt\nDocument ID: pres_123\nDensity: DENSE\n内容をもっと厚くして"
      )
    ).toMatchObject({
      isPptCommand: true,
      intent: "reviseDraft",
      documentId: "pres_123",
      density: "dense",
      body: "内容をもっと厚くして",
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
    expect(parsePptCommand("普通のメッセージ")).toMatchObject({
      isPptCommand: false,
      body: "普通のメッセージ",
    });
  });
});
