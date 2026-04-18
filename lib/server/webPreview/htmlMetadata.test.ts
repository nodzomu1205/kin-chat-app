import { describe, expect, it } from "vitest";
import {
  extractMetaTag,
  extractTitle,
  getHostname,
  resolveHttpUrl,
  resolveUrlMaybeRelative,
} from "@/lib/server/webPreview/htmlMetadata";

describe("htmlMetadata", () => {
  it("extracts matching meta tag content", () => {
    expect(
      extractMetaTag(
        '<meta property="og:description" content="preview text">',
        ["og:description"]
      )
    ).toBe("preview text");
  });

  it("extracts title with og priority", () => {
    expect(
      extractTitle(
        '<meta property="og:title" content="OG title"><title>HTML title</title>'
      )
    ).toBe("OG title");
  });

  it("resolves relative URLs against a base URL", () => {
    expect(
      resolveUrlMaybeRelative("/image.png", "https://example.com/path/page")
    ).toBe("https://example.com/image.png");
  });

  it("resolves hostnames and validates HTTP URLs", () => {
    expect(getHostname("https://example.com/path")).toBe("example.com");
    expect(resolveHttpUrl("https://example.com")).toEqual({
      ok: true,
      url: new URL("https://example.com"),
    });
    expect(resolveHttpUrl("ftp://example.com")).toEqual({
      ok: false,
      error: "unsupported protocol",
    });
  });
});
