export function normalizeContinuationSeriesId(value?: string) {
  const normalized = value?.trim().replace(/^#+/, "") || "";
  return normalized ? `#${normalized}` : "";
}

export function parseSearchContinuation(text: string) {
  const raw = text.trim();
  if (!raw) {
    return { cleanQuery: "", seriesId: undefined as string | undefined };
  }

  const markerPattern =
    /[（(]\s*(?:継続\s*)?[#＃]\s*([0-9A-Za-z_-]+)\s*[）)]/giu;
  let seriesId: string | undefined;
  const cleanQuery = raw
    .replace(markerPattern, (_, value: string) => {
      seriesId = normalizeContinuationSeriesId(value);
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    cleanQuery: cleanQuery || raw,
    seriesId,
  };
}
