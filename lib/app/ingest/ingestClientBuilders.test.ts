import { describe, expect, it } from "vitest";
import {
  buildIngestRequestFormData,
  buildSharedIngestOptions,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingest/ingestClientBuilders";

describe("ingestClient builders", () => {
  it("builds shared ingest options consistently", () => {
    expect(
      buildSharedIngestOptions({
        kind: "auto",
        mode: "compact",
        detail: "detailed",
        readPolicy: "text_first",
        compactCharLimit: 1200,
        simpleImageCharLimit: 800,
      })
    ).toEqual({
      kind: "auto",
      mode: "compact",
      detail: "detailed",
      readPolicy: "text_first",
      compactCharLimit: 1200,
      simpleImageCharLimit: 800,
    });
  });

  it("builds request form data", () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const form = buildIngestRequestFormData({
      file,
      resolvedKind: "text",
      options: buildSharedIngestOptions({
        kind: "auto",
        mode: "compact",
        detail: "detailed",
        readPolicy: "text_first",
        compactCharLimit: 1200,
        simpleImageCharLimit: 800,
      }),
    });

    expect(form.get("file")).toBe(file);
    expect(form.get("kind")).toBe("text");
    expect(form.get("mode")).toBe("compact");
  });

  it("resolves ingest response meta", () => {
    expect(
      resolveIngestFileTitle({
        data: { result: { title: "  Notes  " } },
        fallback: "fallback.txt",
      })
    ).toBe("Notes");

    expect(
      resolveIngestErrorMessage({
        data: { error: "  failed  " },
        fallback: "default failure",
      })
    ).toBe("failed");
  });

  it("normalizes sentence-like ingest titles before storing them", () => {
    expect(
      resolveIngestFileTitle({
        data: {
          result: {
            title:
              "ヨハネスブルグの最新の治安状況（2026年4月現在）は、依然として極めて厳しい状況です",
          },
        },
        fallback: "fallback.txt",
      })
    ).toBe("ヨハネスブルグの最新の治安状況（2026年4月現在）");
  });
});
