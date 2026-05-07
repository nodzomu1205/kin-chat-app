import { callOpenAIResponses, extractOpenAIJsonObjectText } from "@/lib/server/chatgpt/openaiClient";
import { normalizeSlotTextMap } from "@/lib/app/presentation/presentationVisualNormalization";
import type { PresentationVisualNormalizationInput } from "@/lib/app/presentation/presentationVisualNormalization";

export async function normalizePresentationVisualSlotsWithLlm(args: {
  slots: PresentationVisualNormalizationInput[];
}) {
  const slots = args.slots.filter((slot) => slot.key.trim()).slice(0, 80);
  if (slots.length === 0) return { normalized: {} };

  const result = await callOpenAIResponses(
    {
      input: [
        {
          role: "system",
          content: [
            "You normalize presentation visual matching requests into English.",
            "Return JSON only.",
            "For each input slot, produce concise English match text that preserves visible subjects, locations, entities, concrete scene needs, visual type, and domain concepts.",
            "Do not choose images. Do not score. Do not add facts that are not implied by the input.",
            "Keep named places and organizations in romanized/English form when possible.",
            "Output shape: { \"normalized\": { [key: string]: string } }",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({ slots }, null, 2),
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    },
    "{}"
  );
  const parsed = JSON.parse(extractOpenAIJsonObjectText(result.text, "{}")) as {
    normalized?: unknown;
  };
  return {
    normalized: normalizeSlotTextMap(parsed.normalized),
    usage: result.usage,
  };
}

export function resolvePresentationVisualNormalizationRequest(body: unknown) {
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const slots = Array.isArray(record.slots) ? record.slots : [];
  return {
    slots: slots.flatMap((slot): PresentationVisualNormalizationInput[] => {
      if (!slot || typeof slot !== "object") return [];
      const item = slot as Record<string, unknown>;
      const key = typeof item.key === "string" ? item.key.trim() : "";
      if (!key) return [];
      return [
        {
          key,
          label: typeof item.label === "string" ? item.label : "",
          need: typeof item.need === "string" ? item.need : "",
          keywords: Array.isArray(item.keywords)
            ? item.keywords.filter((value): value is string => typeof value === "string")
            : [],
          context: typeof item.context === "string" ? item.context : "",
        },
      ];
    }),
  };
}
