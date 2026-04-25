import { describe, expect, it } from "vitest";
import {
  parseTransformIntent,
  shouldTransformContent,
  splitTextIntoKinChunks,
} from "@/lib/app/task-runtime/transformIntent";

describe("transformIntent", () => {
  it("keeps the public parser and transform predicate wired through the facade", () => {
    const intent = parseTransformIntent("TASK: summarize as bullets", "sys_info");

    expect(intent.mode).toBe("sys_task");
    expect(intent.summarize).toBe(true);
    expect(intent.bulletize).toBe(true);
    expect(shouldTransformContent(intent)).toBe(true);
  });

  it("splits long Kin payloads without exceeding the effective chunk size", () => {
    const chunks = splitTextIntoKinChunks(
      ["alpha ".repeat(300), "beta ".repeat(300), "gamma ".repeat(300)].join(
        "\n\n"
      ),
      1600,
      200
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 1400)).toBe(true);
    expect(chunks.join("\n\n")).toContain("alpha");
  });
});
