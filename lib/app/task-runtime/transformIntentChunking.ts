export function splitTextIntoKinChunks(
  text: string,
  maxChars = 3400,
  reserveChars = 260
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const effectiveMax = Math.max(1200, maxChars - reserveChars);
  if (normalized.length <= effectiveMax) return [normalized];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }
  };

  const addUnit = (unit: string) => {
    const trimmed = unit.trim();
    if (!trimmed) return;

    if (!current) {
      current = trimmed;
      return;
    }

    const candidate = `${current}\n\n${trimmed}`;
    if (candidate.length <= effectiveMax) {
      current = candidate;
      return;
    }

    pushCurrent();
    current = trimmed;
  };

  const splitLongUnit = (unit: string): string[] => {
    const trimmed = unit.trim();
    if (!trimmed) return [];
    if (trimmed.length <= effectiveMax) return [trimmed];

    const lineChunks: string[] = [];
    let buffer = "";

    trimmed.split(/\n/).forEach((line) => {
      const normalizedLine = line.trim();
      if (!normalizedLine) return;

      if (normalizedLine.length > effectiveMax) {
        if (buffer) {
          lineChunks.push(buffer.trim());
          buffer = "";
        }
        for (let i = 0; i < normalizedLine.length; i += effectiveMax) {
          lineChunks.push(normalizedLine.slice(i, i + effectiveMax));
        }
        return;
      }

      const candidate = buffer ? `${buffer}\n${normalizedLine}` : normalizedLine;
      if (candidate.length <= effectiveMax) {
        buffer = candidate;
      } else {
        if (buffer) {
          lineChunks.push(buffer.trim());
        }
        buffer = normalizedLine;
      }
    });

    if (buffer.trim()) {
      lineChunks.push(buffer.trim());
    }

    return lineChunks;
  };

  if (paragraphs.length > 0) {
    paragraphs.forEach((paragraph) => {
      splitLongUnit(paragraph).forEach(addUnit);
    });
  } else {
    splitLongUnit(normalized).forEach(addUnit);
  }

  pushCurrent();
  return chunks;
}
