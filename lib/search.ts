// /lib/search.ts

import { generateId } from "@/lib/uuid";

export type SearchResponse = {
  text: string;
  sources: {
    title: string;
    link: string;
  }[];
};

// 🔍 SerpAPI検索（シンプル版）
export async function searchGoogle(query: string): Promise<SearchResponse> {
  try {
    const apiKey = process.env.SERP_API_KEY;

    if (!apiKey) {
      throw new Error("SERP_API_KEY is not set");
    }

    console.log("🔍 SEARCH QUERY:", query);

    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`
    );

    if (!res.ok) {
      throw new Error("SerpAPI request failed");
    }

    const data = await res.json();

    const results = data.organic_results || [];

    return {
      text: results
        .slice(0, 3)
        .map((r: any) => r.snippet)
        .filter(Boolean)
        .join("\n"),

      sources: results.slice(0, 3).map((r: any) => ({
        title: r.title || "No title",
        link: r.link || "",
      })),
    };
  } catch (error) {
    console.error("Search error:", error);

    return {
      text: "",
      sources: [],
    };
  }
}