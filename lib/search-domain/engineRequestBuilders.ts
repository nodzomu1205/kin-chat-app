import { buildLocationAwareQuery, resolveGoogleNewsLocale } from "@/lib/search-domain/presets";
import type { SearchRequest } from "@/lib/search-domain/types";

export function buildGoogleSearchRequest(request: SearchRequest) {
  return {
    engine: "google" as const,
    q: buildLocationAwareQuery(request.query, request.location),
    location: request.location,
    num: request.maxResults ?? 5,
  };
}

export function buildGoogleNewsRequest(request: SearchRequest) {
  const locale = resolveGoogleNewsLocale(request.location);
  return {
    engine: "google_news" as const,
    q: request.query.trim(),
    gl: locale.gl,
    hl: locale.hl,
    num: request.maxResults ?? 5,
  };
}

export function buildGoogleMapsRequest(request: SearchRequest) {
  return {
    engine: "google_maps" as const,
    q: buildLocationAwareQuery(request.query, request.location),
    num: request.maxResults ?? 5,
  };
}

export function buildGoogleLocalRequest(request: SearchRequest) {
  return {
    engine: "google_local" as const,
    q: buildLocationAwareQuery(request.query, request.location),
    location: request.location,
    num: request.maxResults ?? 5,
  };
}

export function buildGoogleAiModeRequest(request: SearchRequest) {
  return {
    engine: "google_ai_mode" as const,
    serpapiLink: request.askAiModeLink,
    q: request.continuationToken
      ? request.query.trim()
      : buildLocationAwareQuery(request.query, request.location),
    location: request.location,
    num: request.maxResults ?? 5,
    subsequent_request_token: request.continuationToken,
  };
}

export function buildYoutubeSearchRequest(request: SearchRequest) {
  return {
    engine: "youtube" as const,
    num: request.maxResults ?? 5,
    extraParams: {
      search_query: request.query.trim(),
    },
  };
}
