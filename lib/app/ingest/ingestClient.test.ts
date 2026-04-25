import { afterEach, describe, expect, it, vi } from "vitest";
import { requestFileIngest } from "@/lib/app/ingest/ingestClient";
import {
  buildIngestRequestFormData,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingest/ingestClientBuilders";

describe("requestFileIngest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a readable error when /api/ingest returns an empty success body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "",
      })
    );

    await expect(
      requestFileIngest({
        file: new File(["hello"], "hello.txt", { type: "text/plain" }),
        options: {
          kind: "auto",
          mode: "compact",
          detail: "detailed",
          readPolicy: "text_first",
          compactCharLimit: 1200,
          simpleImageCharLimit: 800,
        },
      })
    ).rejects.toThrow("Empty /api/ingest response.");
  });

  it("returns a fallback error payload when /api/ingest returns a non-JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        text: async () => "<html>bad gateway</html>",
      })
    );

    const result = await requestFileIngest({
      file: new File(["hello"], "hello.txt", { type: "text/plain" }),
      options: {
        kind: "auto",
        mode: "compact",
        detail: "detailed",
        readPolicy: "text_first",
        compactCharLimit: 1200,
        simpleImageCharLimit: 800,
      },
    });

    expect(result.response.ok).toBe(false);
    expect(result.data.error).toContain("non-JSON response");
  });
});

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
