export type PresentationVisualSelectionCommand = {
  target: "opening" | "block";
  slideNumber: number;
  blockNumber: number;
  slotNumber?: number;
  off: boolean;
  imageIds: string[];
};

export function parsePresentationVisualSelectionCommand(
  body: string
): PresentationVisualSelectionCommand[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line): PresentationVisualSelectionCommand[] => {
      const openingMatch = line.match(
        /^Opening\s+slide\s*\/\s*visual(?:\s*\/\s*slot\s+(\d+))?\s*:\s*(.*)$/i
      );
      if (openingMatch) {
        const rawValue = openingMatch[2]?.trim() || "";
        return [
          {
            target: "opening",
            slideNumber: 0,
            blockNumber: 0,
            slotNumber: openingMatch[1] ? Number(openingMatch[1]) : undefined,
            off: /^off$/i.test(rawValue),
            imageIds: /^off$/i.test(rawValue) ? [] : splitImageIds(rawValue),
          },
        ];
      }
      const match = line.match(
        /^Slide\s+(\d+)\s*\/\s*block\s+(\d+)(?:\s*\/\s*slot\s+(\d+))?\s*:\s*(.*)$/i
      );
      if (!match) return [];
      const rawValue = match[4]?.trim() || "";
      return [
        {
          target: "block",
          slideNumber: Number(match[1]),
          blockNumber: Number(match[2]),
          slotNumber: match[3] ? Number(match[3]) : undefined,
          off: /^off$/i.test(rawValue),
          imageIds: /^off$/i.test(rawValue) ? [] : splitImageIds(rawValue),
        },
      ];
    });
}

function splitImageIds(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
