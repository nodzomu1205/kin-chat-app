import { describe, expect, it } from "vitest";
import {
  buildCreateInformationInventoryPrompt,
  buildCreatePresentationSpecPrompt,
  buildCreatePresentationStrategyPrompt,
  buildReviseInformationInventoryPrompt,
  buildRevisePresentationStrategyPrompt,
} from "@/lib/app/presentation/presentationGptPrompts";

const inventory = {
  version: "0.2-information-inventory" as const,
  topic: "Russian history",
  language: "ja" as const,
  rawFacts: [
    {
      id: "fact_001",
      text: "Fact",
      sourceHint: "",
    },
  ],
  factGroups: [
    {
      id: "group_001",
      label: "Group",
      factIds: ["fact_001"],
    },
  ],
};

const strategy = {
  version: "0.1-presentation-strategy" as const,
  title: "Deck",
  purpose: "",
  audience: "",
  tone: "educational" as const,
  density: "standard" as const,
  slideCountRange: { min: 4, max: 6, target: 5 },
  selectedFactGroupIds: ["group_001"],
  factGroupPriority: [],
  visualPolicy: {
    overallUse: "selective" as const,
    mustVisualizeFactGroupIds: [],
    avoidVisualFactGroupIds: [],
    preferredVisualTypes: [],
    avoidVisualTypes: [],
    reason: "",
  },
  structurePolicy: {
    preferredFlow: "overview_to_detail" as const,
    allowMultipleFactGroupsPerSlide: true,
    combineRelatedFactGroups: true,
    notes: "",
  },
};

const payload = {
  kind: "kin.presentation" as const,
  version: "0.1" as const,
  documentId: "pres_test",
  status: "draft" as const,
  informationInventory: inventory,
  presentationStrategy: strategy,
  spec: {
    version: "0.1" as const,
    title: "Deck",
    density: "standard" as const,
    slides: [{ type: "title" as const, title: "Deck" }],
  },
  patches: [],
  outputs: [],
  previewText: "",
  summary: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("presentationGptPrompts", () => {
  it("keeps presentation concepts out of the information inventory prompt", () => {
    const prompt = buildCreateInformationInventoryPrompt({
      userInstruction: "Create a deck about Russian history.",
    });

    expect(prompt).toContain("This step is NOT about PowerPoint");
    expect(prompt).toContain("rawFacts is the primary output");
    expect(prompt).toContain("factGroups is only a light semantic classification");
    expect(prompt).toContain("do not add kind, importance");
    expect(prompt).toContain("rawFacts is not a summary");
    expect(prompt).toContain("do not target a fixed number of facts");
    expect(prompt).toContain("do not stop at 4 or 5 facts");
    expect(prompt).not.toContain("PresentationSpec");
    expect(prompt).not.toContain("slideCountRange");
  });

  it("keeps presentation strategy meta-level without slide-by-slide drafting", () => {
    const prompt = buildCreatePresentationStrategyPrompt({
      userInstruction: "Create a deck.",
      inventory,
      density: "standard",
    });

    expect(prompt).toContain("meta-level editing strategy");
    expect(prompt).toContain("Do not create individual slides");
    expect(prompt).toContain('density must be "standard"');
    expect(prompt).toContain("visuals are not mandatory for every slide");
  });

  it("creates the renderer spec prompt only after inventory and strategy exist", () => {
    const prompt = buildCreatePresentationSpecPrompt({
      userInstruction: "Create a deck.",
      inventory,
      strategy,
    });

    expect(prompt).toContain("renderer-ready PresentationSpec v0.1");
    expect(prompt).toContain("Use the InformationInventory as the source of facts");
    expect(prompt).toContain("do not force every slide to have a visual");
    expect(prompt).toContain("do not output unsupported fields such as images");
    expect(prompt).toContain("represent it with supported slide structures such as twoColumn");
  });

  it("revises inventory and strategy before regenerating the spec", () => {
    const inventoryPrompt = buildReviseInformationInventoryPrompt({
      userInstruction: "もっと内容を濃くして、専門的に。",
      payload,
    });
    const strategyPrompt = buildRevisePresentationStrategyPrompt({
      userInstruction: "Density: dense 写真を入れて！",
      payload,
      inventory,
      density: "dense",
    });

    expect(inventoryPrompt).toContain("expand rawFacts first");
    expect(inventoryPrompt).toContain("Current InformationInventory JSON");
    expect(strategyPrompt).toContain("density must be \"dense\"");
    expect(strategyPrompt).toContain("update visualPolicy");
    expect(strategyPrompt).toContain("visuals are not mandatory for every slide");
  });
});
