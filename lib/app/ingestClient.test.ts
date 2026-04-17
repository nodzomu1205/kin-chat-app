import { describe, expect, it } from "vitest";
import {
  buildIngestRequestFormData,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingestClient";

describe("ingestClient", () => {
  it("builds the shared ingest request form data", () => {
    const file = new File(["hello"], "hello.txt", {
      type: "text/plain",
    });
    const form = buildIngestRequestFormData({
      file,
      resolvedKind: "text",
      options: {
        kind: "auto",
        mode: "compact",
        detail: "detailed",
        readPolicy: "text_first",
        compactCharLimit: 1200,
        simpleImageCharLimit: 800,
      },
    });

    expect(form.get("file")).toBe(file);
    expect(form.get("kind")).toBe("text");
    expect(form.get("mode")).toBe("compact");
    expect(form.get("detail")).toBe("detailed");
    expect(form.get("readPolicy")).toBe("text_first");
    expect(form.get("compactCharLimit")).toBe("1200");
    expect(form.get("simpleImageCharLimit")).toBe("800");
  });

  it("resolves the ingest title from the shared response", () => {
    expect(
      resolveIngestFileTitle({
        data: {
          result: {
            title: "  Notes  ",
          },
        },
        fallback: "fallback.txt",
      })
    ).toBe("Notes");
    expect(
      resolveIngestFileTitle({
        data: {
          result: {
            title: "",
          },
        },
        fallback: "fallback.txt",
      })
    ).toBe("fallback.txt");
  });

  it("resolves the ingest error message from the shared response", () => {
    expect(
      resolveIngestErrorMessage({
        data: {
          error: "  failed  ",
        },
        fallback: "default failure",
      })
    ).toBe("failed");
    expect(
      resolveIngestErrorMessage({
        data: {},
        fallback: "default failure",
      })
    ).toBe("default failure");
  });
});
