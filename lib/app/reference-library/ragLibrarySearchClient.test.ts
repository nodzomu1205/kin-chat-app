import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRagLibraryReferenceContext } from "@/lib/app/reference-library/ragLibrarySearchClient";

describe("fetchRagLibraryReferenceContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps matchCount at the search API limit", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          ok: true,
          context: "",
          matches: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchRagLibraryReferenceContext({
      query: "farmers 360 link",
      matchCount: 999,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      query: "farmers 360 link",
      matchCount: 50,
      candidateCount: 100,
    });
  });

  it("passes candidate count and similarity threshold", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true, matches: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchRagLibraryReferenceContext({
      query: "school",
      matchCount: 10,
      candidateCount: 100,
      matchThreshold: 0.3,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      query: "school",
      matchCount: 10,
      candidateCount: 100,
      matchThreshold: 0.3,
    });
  });
});
