type SerpApiRequest = {
  engine: string;
  q: string;
  location?: string;
  gl?: string;
  hl?: string;
  num?: number;
  subsequent_request_token?: string;
  serpapiLink?: string;
};

function buildSerpApiUrl(params: SerpApiRequest) {
  const apiKey = process.env.SERP_API_KEY;
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
  url.searchParams.set("q", params.q);
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

  return url.toString();
}

export async function requestSerpApi(params: SerpApiRequest) {
  const response = await fetch(buildSerpApiUrl(params), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}
