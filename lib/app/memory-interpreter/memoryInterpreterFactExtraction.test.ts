import { describe, expect, it } from "vitest";
import {
  extractFacts,
  pruneFactsForTopic,
} from "@/lib/app/memory-interpreter/memoryInterpreterFactExtraction";
import type { Message } from "@/types/chat";

function buildMessage(role: Message["role"], text: string): Message {
  return { id: `${role}-${text}`, role, text };
}

describe("memoryInterpreterFactExtraction", () => {
  it("extracts useful fact sentences and ignores follow-up invitations", () => {
    expect(
      extractFacts([
        buildMessage(
          "gpt",
          "ドストエフスキーはロシアの小説家です。\n興味があれば、他に知りたいことも教えてくださいね。"
        ),
      ])
    ).toEqual(["ドストエフスキーはロシアの小説家です。"]);
  });

  it("merges or replaces facts based on topic switching", () => {
    expect(pruneFactsForTopic(["old"], ["new"], false)).toEqual(["old", "new"]);
    expect(pruneFactsForTopic(["old"], ["new"], true)).toEqual(["new"]);
  });

  it("ignores SYS-formatted blocks and accepts library/task-info display text", () => {
    expect(
      extractFacts([
        {
          id: "sys-1",
          role: "gpt",
          text: "<<SYS_TASK>>\nBODY: hidden\n<<END_SYS_TASK>>",
        },
        {
          id: "lib-1",
          role: "user",
          text: "Library: Review Notes\n\nDetail:\nNapoleon remained influential in French political memory.",
          meta: { kind: "task_info", sourceType: "manual" },
        },
      ])
    ).toEqual(["Napoleon remained influential in French political memory."]);
  });

  it("extracts every item from library aggregate summary displays", () => {
    const facts = extractFacts([
      {
        id: "library-summary",
        role: "gpt",
        text: [
          "Library Data",
          "Mode: summary",
          "Items: 3",
          "",
          "1. Alpha [ingested_file] alpha.txt",
          "",
          "Summary: Alpha has a long strategic note about textile traceability, community building, launch funding, partner validation, and a practical plan for testing the business before scale.",
          "",
          "2. Beta [ingested_file] beta.txt",
          "",
          "Summary: Beta describes a consumer experience plan that connects products, QR codes, brand storytelling, and partner collaboration so shoppers can understand the background of each product.",
          "",
          "3. Gamma [ingested_file] gamma.txt",
          "",
          "Summary: Gamma focuses on redesigning the relationship between consumers and producers through short product stories, feedback loops, and a data platform for future improvements.",
        ].join("\n"),
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);

    expect(facts).toHaveLength(3);
    expect(facts[0]).toContain("Alpha");
    expect(facts[1]).toContain("Beta");
    expect(facts[2]).toContain("Gamma");
    expect(facts.join("\n")).not.toContain("Mode: summary");
  });

  it("ignores file import and drive folder status messages", () => {
    expect(
      extractFacts([
        {
          id: "folder-status",
          role: "gpt",
          text: "[Folder] FL360/システム開発 | 2026-04-26 11:04",
          meta: { kind: "task_info", sourceType: "manual" },
        },
        {
          id: "drive-save-status",
          role: "gpt",
          text: [
            "Google Driveファイルをライブラリに保存しました: FL360/farmers 360° link 再起動計画.txt",
            "抽出文字数: 1,219 chars",
          ].join("\n"),
          meta: { kind: "task_info", sourceType: "file_ingest" },
        },
        {
          id: "local-save-status",
          role: "gpt",
          text: [
            "ファイルをライブラリに保存しました: 日本起業戦略メモ",
            "抽出文字数: 12,345 chars",
          ].join("\n"),
          meta: { kind: "task_info", sourceType: "file_ingest" },
        },
      ])
    ).toEqual([]);
  });

  it("ignores conversation compaction labels while keeping the compacted content", () => {
    expect(
      extractFacts([
        {
          id: "compact-1",
          role: "gpt",
          text: [
            "[Conversation compaction]",
            "User is researching the cotton supply chain and current traceability regulations.",
          ].join("\n"),
          meta: { kind: "task_info", sourceType: "manual" },
        },
      ])
    ).toEqual([
      "User is researching the cotton supply chain and current traceability regulations.",
    ]);
  });

  it("fairly extracts facts from long displayed structured responses", () => {
    const facts = extractFacts([
      {
        id: "gpt-structured-1",
        role: "gpt",
        text: [
          "1. Alpha launch plan",
          "",
          "Summary: Alpha focuses on traceability, partner validation, and early community testing before expanding the product.",
          "",
          "Detail:",
          "Alpha needs one story page, a Vercel publication step, and a partner feedback loop. The team will test QR based product explanations with initial users.",
          "",
          "2. Beta launch plan",
          "",
          "Summary: Beta focuses on consumer storytelling, product background data, and brand trust through short mobile experiences.",
          "",
          "Detail:",
          "Beta needs a compact onboarding route, a reusable story template, and a feedback collection loop. The project treats consumer understanding as the first validation target.",
        ].join("\n"),
        meta: { kind: "task_info", sourceType: "manual" },
      },
      {
        id: "gpt-structured-2",
        role: "gpt",
        text: [
          "1. Gamma operations note",
          "",
          "Summary: Gamma focuses on producer collaboration, operational metrics, and a repeatable publication process for future stories.",
          "",
          "Detail:",
          "Gamma needs publishing checkpoints and an internal review list. The workflow should keep producer updates separate from consumer-facing text.",
        ].join("\n"),
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);

    expect(facts.length).toBeGreaterThanOrEqual(5);
    expect(facts.some((fact) => fact.includes("Alpha"))).toBe(true);
    expect(facts.some((fact) => fact.includes("Beta"))).toBe(true);
    expect(facts.some((fact) => fact.includes("Gamma"))).toBe(true);
    expect(facts.some((fact) => fact.includes("story page"))).toBe(true);
    expect(facts.some((fact) => fact.includes("consumer storytelling"))).toBe(true);
  });

  it("keeps rich response details ahead of short headings when trimmed later", () => {
    const facts = extractFacts([
      {
        id: "long-library-data",
        role: "gpt",
        text: [
          "1. Alpha launch plan",
          "",
          "Summary: Alpha focuses on textile traceability, community testing, and partner validation before the first product expansion.",
          "",
          "Detail:",
          "Alpha needs one story page, a Vercel publication step, and a partner feedback loop. The team will test QR based product explanations with initial users.",
          "",
          "2. Beta launch plan",
          "",
          "Summary: Beta focuses on consumer storytelling, product background data, and brand trust through short mobile experiences.",
          "",
          "Detail:",
          "Beta needs a compact onboarding route, reusable story templates, and feedback collection. The project treats consumer understanding as the first validation target.",
          "",
          "3. Gamma operations note",
          "",
          "Summary: Gamma focuses on producer collaboration, operational metrics, and a repeatable publication process for future stories.",
          "",
          "Detail:",
          "Gamma needs publishing checkpoints and an internal review list. The workflow should keep producer updates separate from consumer-facing text.",
          "",
          "4. Delta system note",
          "",
          "Summary: Delta focuses on a mobile-first story page MVP for an apparel experience platform.",
          "",
          "Detail:",
          "How to run locally",
        ].join("\n"),
        meta: { kind: "task_info", sourceType: "manual" },
      },
      buildMessage("gpt", "ストーリーページを1つ作る"),
      buildMessage("gpt", "公開する (Vercel)"),
    ]);

    const displayedCapacityFacts = facts.slice(-8);
    expect(displayedCapacityFacts.some((fact) => fact.includes("partner feedback loop"))).toBe(
      true
    );
    expect(displayedCapacityFacts.some((fact) => fact.includes("compact onboarding route"))).toBe(
      true
    );
    expect(facts.some((fact) => fact.includes("consumer storytelling"))).toBe(true);
    expect(facts.join("\n")).not.toContain("How to run locally");
  });

  it("skips markdown headings inside detailed library output", () => {
    const facts = extractFacts([
      {
        id: "markdown-detail",
        role: "gpt",
        text: [
          "1. 日本起業戦略メモ [ingested_file] FL360/日本起業戦略メモ [1678chars].txt",
          "",
          "Summary: 起業計画は繊維産業のトレーサビリティとコミュニティ構築をテーマにしています。",
          "",
          "Detail:",
          "# Emma共有用：日本起業戦略メモ（Noz案）",
          "",
          "## 0. 前提",
          "",
          "自己資金は3,000万円で、外部調達目標は約2,000万円です。",
          "",
          "2. farmers 360° link 再起動戦略 [ingested_file] FL360/farmers 360° link 再起動戦略 [1484chars].txt",
          "",
          "Summary: farmers 360° link は製品背景を見えるようにする再起動戦略です。",
          "",
          "Detail:",
          "# farmers 360° link 再起動戦略ドキュメント",
          "",
          "#### 1.",
          "",
          "QRコードを通じて消費者が商品の背景を短時間で理解できる体験を提供します。",
        ].join("\n"),
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);

    expect(facts.some((fact) => fact.includes("自己資金は3,000万円"))).toBe(true);
    expect(facts.some((fact) => fact.includes("QRコードを通じて"))).toBe(true);
    expect(facts.join("\n")).not.toContain("Emma共有用");
    expect(facts.join("\n")).not.toContain("#### 1.");
  });

  it("shortens library source prefixes and drops incomplete fragments", () => {
    const facts = extractFacts([
      {
        id: "quality",
        role: "gpt",
        text: [
          "1. Build a mobile-first story page MVP [ingested_file] FL360/システム開発/Build a mobile-first story page MVP [8502chars].txt",
          "",
          "Summary: この文書は、アパレル体験プラットフォーム向けに、Next.",
          "",
          "Detail:",
          "isを使用してモバイルファーストのストーリーページMVPを構築するための指針を示しています。",
          "Next.jsとVercelを使い、QRコードから商品の背景を短時間で読める体験を提供します。",
          "",
          "2. farmers 360° link [ingested_file] FL360_farmers 360° link [9492chars].txt",
          "",
          "Summary: The farmers 360° link connects small-scale African cotton farmers with Japanese consumers via a blockchain-based traceability platform.",
          "",
          "Detail:",
          "Consumers can scan QR codes on products to learn about farmers' stories and challenges, supporting sustainable practices with part of their purchases.",
        ].join("\n"),
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);

    expect(facts.some((fact) => fact.startsWith("Build a mobile-first story page MVP:"))).toBe(
      true
    );
    expect(facts.some((fact) => fact.startsWith("farmers 360° link:"))).toBe(true);
    expect(facts.join("\n")).not.toContain("[ingested_file]");
    expect(facts.join("\n")).not.toContain("FL360/");
    expect(facts.join("\n")).not.toContain("、Next.");
    expect(facts.join("\n")).not.toContain("isを使用して");
  });
});
