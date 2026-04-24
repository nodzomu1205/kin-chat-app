import { describe, expect, it } from "vitest";
import { looksLikeKinTaskStartInstruction } from "@/lib/app/kinTaskStartDetection";

describe("kinTaskStartDetection", () => {
  it("detects explicit TASK prefixes", () => {
    expect(looksLikeKinTaskStartInstruction("TASK: summarize this")).toBe(true);
  });

  it("detects Kin task-start wording", () => {
    expect(looksLikeKinTaskStartInstruction("Kinにタスクとして送って")).toBe(true);
    expect(looksLikeKinTaskStartInstruction("この内容をまとめて")).toBe(true);
  });

  it("does not treat ordinary short replies as task starts", () => {
    expect(looksLikeKinTaskStartInstruction("ありがとう")).toBe(false);
  });
});
