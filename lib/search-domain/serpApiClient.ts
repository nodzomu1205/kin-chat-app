import {
  buildSerpApiErrorMessage,
  buildSerpApiUrl,
} from "@/lib/search-domain/serpApiClientBuilders";

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

export async function requestSerpApi(params: SerpApiRequest) {
  const response = await fetch(
    buildSerpApiUrl(params, process.env.SERP_API_KEY || ""),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(buildSerpApiErrorMessage(response.status));
  }

  return (await response.json()) as Record<string, unknown>;
}
