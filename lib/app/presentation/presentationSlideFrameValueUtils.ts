export function extractJsonCandidate(lines: string[]) {
  const joined = lines
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .join("\n")
    .trim();
  const fenced = joined.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const firstArray = joined.indexOf("[");
  const firstObject = joined.indexOf("{");
  const start =
    firstArray >= 0 && firstObject >= 0
      ? Math.min(firstArray, firstObject)
      : Math.max(firstArray, firstObject);
  return start >= 0 ? joined.slice(start).trim() : joined;
}

export function parseJsonValueFromLines(lines: string[]) {
  if (lines.length === 0) return null;
  try {
    return JSON.parse(extractJsonCandidate(lines));
  } catch {
    return null;
  }
}

export function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

export function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  const text = stringValue(value);
  return text ? [text] : [];
}

export function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function positiveNumberValue(value: unknown) {
  const number = numberValue(value);
  return number && number > 0 ? number : undefined;
}
