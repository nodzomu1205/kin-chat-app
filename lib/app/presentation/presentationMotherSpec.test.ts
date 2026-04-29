import { describe, expect, it } from "vitest";
import {
  adaptMotherSpecToPresentationSpec,
  parsePresentationMotherSpec,
} from "@/lib/app/presentation/presentationMotherSpec";

describe("presentationMotherSpec", () => {
  it("normalizes complete mother JSON with required empty fields", () => {
    const mother = parsePresentationMotherSpec({
      version: "0.2-mother",
      title: "Deck",
      purpose: "",
      audience: "",
      language: "ja",
      density: "dense",
      theme: "business-clean",
      sourceIntent: "Create a rich deck.",
      slides: [
        {
          title: "Market shift",
          templateFrame: "",
          wallpaper: "",
          bodies: [
            {
              keyMessage: "Demand is moving to story-led products.",
              keyMessageFacts: ["Consumers compare origin stories."],
              keyVisual: {
                type: "diagram",
                brief: "Consumer decision flow",
                assetId: "",
                status: "pending",
              },
              keyVisualFacts: ["QR touchpoints can expose product background."],
            },
          ],
          script: "Explain the shift from commodity comparison to story comparison.",
        },
      ],
    });

    expect(mother).toMatchObject({
      version: "0.2-mother",
      title: "Deck",
      slides: [
        {
          bodies: [
            {
              keyVisual: {
                type: "diagram",
                status: "pending",
              },
            },
          ],
        },
      ],
    });
  });

  it("adapts one body to a v0.1 bullets slide", () => {
    const spec = adaptMotherSpecToPresentationSpec(
      parsePresentationMotherSpec({
        version: "0.2-mother",
        title: "Deck",
        purpose: "Proposal",
        audience: "Executives",
        language: "en",
        density: "standard",
        theme: "business-clean",
        sourceIntent: "",
        slides: [
          {
            title: "Core claim",
            templateFrame: "",
            wallpaper: "",
            bodies: [
              {
                keyMessage: "Start with one focused message.",
                keyMessageFacts: ["Fact A", "Fact B"],
                keyVisual: {
                  type: "none",
                  brief: "",
                  assetId: "",
                  status: "none",
                },
                keyVisualFacts: [],
              },
            ],
            script: "Talk through the two supporting facts.",
          },
        ],
      })
    );

    expect(spec).toMatchObject({
      version: "0.1",
      title: "Deck",
      slides: [
        {
          type: "bullets",
          title: "Core claim",
          lead: "Start with one focused message.",
          bullets: [{ text: "Fact A" }, { text: "Fact B" }],
          notes: "Talk through the two supporting facts.",
        },
      ],
    });
  });

  it("omits mother density while applying render density to v0.1 output", () => {
    const mother = parsePresentationMotherSpec({
      version: "0.2-mother",
      title: "Deck",
      purpose: "",
      audience: "",
      language: "ja",
      density: "concise",
      theme: "business-clean",
      sourceIntent: "",
      slides: [
        {
          title: "Core claim",
          templateFrame: "",
          wallpaper: "",
          bodies: [
            {
              keyMessage: "Start with one focused message.",
              keyMessageFacts: ["Fact A"],
              keyVisual: {
                type: "none",
                brief: "",
                assetId: "",
                status: "none",
              },
              keyVisualFacts: [],
            },
          ],
          script: "",
        },
      ],
    });
    const spec = adaptMotherSpecToPresentationSpec(mother, {
      renderDensity: "concise",
    });

    expect(mother.density).toBeUndefined();
    expect(spec.density).toBe("concise");
  });

  it("adapts one body with a visual request to a v0.1 twoColumn slide", () => {
    const spec = adaptMotherSpecToPresentationSpec(
      parsePresentationMotherSpec({
        version: "0.2-mother",
        title: "Deck",
        purpose: "",
        audience: "",
        language: "ja",
        density: "dense",
        theme: "business-clean",
        sourceIntent: "",
        slides: [
          {
            title: "Visual-backed claim",
            templateFrame: "",
            wallpaper: "",
            bodies: [
              {
                keyMessage: "Message belongs on the left.",
                keyMessageFacts: ["Fact A"],
                keyVisual: {
                  type: "diagram",
                  brief: "Simple system flow",
                  assetId: "",
                  status: "pending",
                },
                keyVisualFacts: ["Visual should show three steps."],
              },
            ],
            script: "Talk through the message and the visual.",
          },
        ],
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "twoColumn",
      title: "Visual-backed claim",
      left: {
        heading: "Message belongs on the left.",
        bullets: [{ text: "Fact A" }],
      },
      right: {
        heading: "diagram request",
        body: "Simple system flow",
        bullets: [{ text: "Visual should show three steps." }],
      },
      notes: "Talk through the message and the visual.",
    });
  });

  it("adapts two bodies to a v0.1 twoColumn slide", () => {
    const spec = adaptMotherSpecToPresentationSpec(
      parsePresentationMotherSpec({
        version: "0.2-mother",
        title: "Deck",
        purpose: "",
        audience: "",
        language: "ja",
        sourceIntent: "",
        slides: [
          {
            title: "Before and after",
            templateFrame: "compare",
            wallpaper: "",
            bodies: [
              {
                keyMessage: "Before",
                keyMessageFacts: ["Disconnected data"],
                keyVisual: { type: "none", brief: "", assetId: "", status: "none" },
                keyVisualFacts: [],
              },
              {
                keyMessage: "After",
                keyMessageFacts: ["Shared story layer"],
                keyVisual: { type: "diagram", brief: "Flow", assetId: "", status: "pending" },
                keyVisualFacts: ["Three actors connect"],
              },
            ],
            script: "",
          },
        ],
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "twoColumn",
      left: {
        heading: "Before",
        bullets: [{ text: "Disconnected data" }],
      },
      right: {
        heading: "After",
        bullets: [
          { text: "Shared story layer" },
          { text: "Three actors connect" },
          { text: "diagram: Flow", emphasis: "muted" },
        ],
      },
    });
  });

  it("uses slide script as fallback visible content when GPT leaves body empty", () => {
    const spec = adaptMotherSpecToPresentationSpec(
      parsePresentationMotherSpec({
        version: "0.2-mother",
        title: "Deck",
        purpose: "",
        audience: "",
        language: "ja",
        sourceIntent: "",
        slides: [
          {
            title: "History overview",
            templateFrame: "standard",
            wallpaper: "",
            bodies: [
              {
                keyMessage: "",
                keyMessageFacts: [],
                keyVisual: { type: "none", brief: "", assetId: "", status: "none" },
                keyVisualFacts: [],
              },
            ],
            script: "Explain the historical background and why it matters now.",
          },
        ],
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "bullets",
      title: "History overview",
      bullets: [
        {
          text: "Explain the historical background and why it matters now.",
        },
      ],
      notes: "Explain the historical background and why it matters now.",
    });
  });
});
