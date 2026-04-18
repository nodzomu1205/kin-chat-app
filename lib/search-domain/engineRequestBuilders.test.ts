import { describe, expect, it } from "vitest";
import {
  buildGoogleAiModeRequest,
  buildGoogleLocalRequest,
  buildGoogleMapsRequest,
  buildGoogleNewsRequest,
  buildGoogleSearchRequest,
  buildYoutubeSearchRequest,
} from "@/lib/search-domain/engineRequestBuilders";
import type { SearchRequest } from "@/lib/search-domain/types";

describe("engineRequestBuilders", () => {
  it("builds google search and news requests", () => {
    const request = {
      query: "tokyo weather",
      location: "Tokyo, Japan",
      maxResults: 3,
    } as SearchRequest;

    expect(buildGoogleSearchRequest(request)).toEqual({
      engine: "google",
      q: "tokyo weather Tokyo, Japan",
      location: "Tokyo, Japan",
      num: 3,
    });

    expect(buildGoogleNewsRequest(request)).toEqual({
      engine: "google_news",
      q: "tokyo weather",
      gl: "jp",
      hl: "ja",
      num: 3,
    });
  });

  it("builds maps/local/ai/youtube requests", () => {
    const request = {
      query: "coffee shops",
      location: "Cape Town, South Africa",
      maxResults: 4,
      continuationToken: "TOKEN-1",
      askAiModeLink: "https://serpapi.com/search.json?engine=google_ai_mode",
    } as SearchRequest;

    expect(buildGoogleMapsRequest(request)).toEqual({
      engine: "google_maps",
      q: "coffee shops Cape Town, South Africa",
      num: 4,
    });
    expect(buildGoogleLocalRequest(request)).toEqual({
      engine: "google_local",
      q: "coffee shops Cape Town, South Africa",
      location: "Cape Town, South Africa",
      num: 4,
    });
    expect(buildGoogleAiModeRequest(request)).toEqual({
      engine: "google_ai_mode",
      serpapiLink: "https://serpapi.com/search.json?engine=google_ai_mode",
      q: "coffee shops",
      location: "Cape Town, South Africa",
      num: 4,
      subsequent_request_token: "TOKEN-1",
    });
    expect(buildYoutubeSearchRequest(request)).toEqual({
      engine: "youtube",
      num: 4,
      extraParams: {
        search_query: "coffee shops",
      },
    });
  });
});
