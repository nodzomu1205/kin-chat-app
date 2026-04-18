type SerpApiRequest = {
  engine: string;
  q?: string;
  location?: string;
  gl?: string;
  hl?: string;
  num?: number;
  subsequent_request_token?: string;
  serpapiLink?: string;
  extraParams?: Record<string, string | number | undefined>;
};

export function buildSerpApiUrl(params: SerpApiRequest, apiKey: string) {
  if (!apiKey) {
    throw new Error("SERP_API_KEY is not set");
  }

  if (params.serpapiLink?.trim()) {
    const url = new URL(params.serpapiLink.trim());
    if (!url.searchParams.get("api_key")) {
      url.searchParams.set("api_key", apiKey);
    }
    return url.toString();
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", params.engine);
  if (params.q?.trim()) {
    url.searchParams.set("q", params.q);
  }
  url.searchParams.set("api_key", apiKey);
  if (params.location?.trim()) {
    url.searchParams.set("location", params.location.trim());
  }
  if (params.gl?.trim()) {
    url.searchParams.set("gl", params.gl.trim());
  }
  if (params.hl?.trim()) {
    url.searchParams.set("hl", params.hl.trim());
  }
  if (params.num && params.num > 0) {
    url.searchParams.set("num", String(params.num));
  }
  if (params.subsequent_request_token?.trim()) {
    url.searchParams.set(
      "subsequent_request_token",
      params.subsequent_request_token.trim()
    );
  }
  Object.entries(params.extraParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    url.searchParams.set(key, normalized);
  });

  return url.toString();
}

export function buildSerpApiErrorMessage(status: number) {
  return `SerpAPI request failed: ${status}`;
}
