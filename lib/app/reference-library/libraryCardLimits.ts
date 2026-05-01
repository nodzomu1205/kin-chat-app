import type { ReferenceLibraryItem } from "@/types/chat";

export function resolveLibraryCardLimitDeletionIds(args: {
  items: ReferenceLibraryItem[];
  libraryCardLimit: number;
  imageLibraryCardLimit: number;
}) {
  return [
    ...resolveOverflowSourceIds({
      items: args.items.filter(
        (item) =>
          item.itemType === "ingested_file" &&
          item.artifactType !== "generated_image"
      ),
      limit: args.libraryCardLimit,
    }),
    ...resolveOverflowSourceIds({
      items: args.items.filter(
        (item) =>
          item.itemType === "ingested_file" &&
          item.artifactType === "generated_image"
      ),
      limit: args.imageLibraryCardLimit,
    }),
  ];
}

function resolveOverflowSourceIds(args: {
  items: ReferenceLibraryItem[];
  limit: number;
}) {
  const limit = Math.max(0, Math.floor(args.limit));
  if (args.items.length <= limit) return [];
  return args.items.slice(limit).map((item) => item.sourceId);
}
