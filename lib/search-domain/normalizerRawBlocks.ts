import type { SearchSourceItem } from "@/types/task";

type LocalResult = {
  title?: string;
  address?: string;
  link?: string;
  place_id_search?: string;
  website?: string;
  links?: { directions?: string };
  rating?: number;
  reviews?: number;
  description?: string;
};

export function buildRawBlock(label: string, items: SearchSourceItem[]) {
  if (items.length === 0) return `${label}\n- No items found`;
  return [
    label,
    ...items.map((item) =>
      [
        `- ${item.title}`,
        item.link ? `  URL: ${item.link}` : "",
        item.snippet ? `  Snippet: ${item.snippet}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n");
}

export function buildLocalRawBlock(label: string, items: LocalResult[]) {
  if (items.length === 0) return `${label}\n- No local results found`;
  return [
    label,
    ...items.map((item) =>
      [
        `- ${item.title || "Untitled"}`,
        item.address ? `  Address: ${item.address}` : "",
        typeof item.rating === "number" ? `  Rating: ${item.rating}` : "",
        typeof item.reviews === "number" ? `  Reviews: ${item.reviews}` : "",
        item.website ? `  Website: ${item.website}` : "",
        item.links?.directions ? `  Directions: ${item.links.directions}` : "",
        item.link ? `  Link: ${item.link}` : "",
        item.place_id_search ? `  Place: ${item.place_id_search}` : "",
        item.description ? `  Description: ${item.description}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n");
}
