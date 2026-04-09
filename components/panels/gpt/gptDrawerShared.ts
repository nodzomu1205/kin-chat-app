import type { CSSProperties } from "react";

export function formatUpdatedAt(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countText(
  completedCount?: number,
  targetCount?: number,
  status?: string
) {
  if (typeof completedCount === "number" && typeof targetCount === "number") {
    return `${completedCount}/${targetCount}`;
  }
  return status || "-";
}

export const sectionCardStyle: CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 18,
  background: "rgba(255,255,255,0.92)",
  padding: 14,
};
