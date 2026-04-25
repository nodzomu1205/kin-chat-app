import { describe, expect, it } from "vitest";
import { normalizeMultipartAssemblies } from "@/lib/app/multipart/multipartAssembliesState";

describe("multipartAssembliesState", () => {
  it("keeps only structurally valid multipart assemblies", () => {
    expect(
      normalizeMultipartAssemblies([
        {
          id: "task-1",
          parts: [],
          assembledText: "hello",
        },
        {
          id: 123,
        },
      ])
    ).toEqual([
      {
        id: "task-1",
        parts: [],
        assembledText: "hello",
      },
    ]);
  });

  it("returns an empty list for invalid storage payloads", () => {
    expect(normalizeMultipartAssemblies(null)).toEqual([]);
    expect(normalizeMultipartAssemblies({})).toEqual([]);
  });
});
