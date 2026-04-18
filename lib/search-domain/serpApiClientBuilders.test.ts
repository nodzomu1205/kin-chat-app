import { describe, expect, it } from "vitest";
import {
  buildSerpApiErrorMessage,
  buildSerpApiUrl,
} from "@/lib/search-domain/serpApiClientBuilders";

describe("serpApiClientBuilders", () => {
  it("builds a standard SerpAPI URL", () => {
    expect(
      buildSerpApiUrl(
        {
          engine: "google",
          q: "tokyo weather",
          location: "Tokyo, Japan",
          num: 5,
          extraParams: { safe: "active" },
        },
        "test-key"
      )
    ).toContain("engine=google");
  });

  it("adds api_key to fallback serpapi links", () => {
    expect(
      buildSerpApiUrl(
        {
          engine: "google",
          serpapiLink: "https://serpapi.com/search.json?engine=google&q=test",
        },
        "test-key"
      )
    ).toContain("api_key=test-key");
  });

  it("builds a request error message", () => {
    expect(buildSerpApiErrorMessage(503)).toBe("SerpAPI request failed: 503");
  });
});
