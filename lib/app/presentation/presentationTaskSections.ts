import type { TaskResult } from "@/types/task";
import { cleanBulletPrefix } from "@/lib/app/presentation/slidePartsParser";

export function findBlock(result: TaskResult | null, names: string[]) {
  if (!result) return [];
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    result.detailBlocks.find((block) =>
      normalizedNames.some((name) => block.title.toLowerCase().includes(name))
    )?.body || []
  );
}

export function findExactBlock(result: TaskResult | null, names: string[]) {
  if (!result) return [];
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    result.detailBlocks.find((block) =>
      normalizedNames.some((name) => block.title.toLowerCase() === name)
    )?.body || []
  );
}

export function parseSectionLines(text: string) {
  const sections: Record<string, string[]> = {};
  let current = "";
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const sectionMatch = line.match(/^\u25a0\s*(.+)$/u);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      sections[current] = sections[current] || [];
      return;
    }
    if (current && line.startsWith("-")) {
      sections[current].push(cleanBulletPrefix(line));
    }
  });
  return sections;
}

export function findSection(sections: Record<string, string[]>, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(sections).find(([title]) =>
    normalizedNames.some((name) => title.toLowerCase().includes(name))
  );
  return entry?.[1] || [];
}

export function findExactSection(sections: Record<string, string[]>, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(sections).find(([title]) => {
    const normalizedTitle = title.toLowerCase();
    return normalizedNames.some((name) => normalizedTitle === name);
  });
  return entry?.[1] || [];
}

export function extractSummaryFromText(text: string) {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("讎りｦ・"))
      ?.replace(/^讎りｦ・\s*/, "")
      .trim() || ""
  );
}
