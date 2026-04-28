import type { PresentationTheme } from "./schema.js";

export type RendererTheme = {
  name: PresentationTheme;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
  accentSoft: string;
  border: string;
  inverseText: string;
  fontFace: string;
};

export const themes: Record<PresentationTheme, RendererTheme> = {
  "business-clean": {
    name: "business-clean",
    background: "F7F8FA",
    surface: "FFFFFF",
    text: "1F2937",
    mutedText: "64748B",
    accent: "2563EB",
    accentSoft: "DBEAFE",
    border: "CBD5E1",
    inverseText: "FFFFFF",
    fontFace: "Aptos"
  },
  "warm-minimal": {
    name: "warm-minimal",
    background: "FAF7F2",
    surface: "FFFFFF",
    text: "2F2A24",
    mutedText: "766B5F",
    accent: "B45309",
    accentSoft: "FEF3C7",
    border: "E7D8C9",
    inverseText: "FFFFFF",
    fontFace: "Aptos"
  },
  "executive-dark": {
    name: "executive-dark",
    background: "111827",
    surface: "1F2937",
    text: "F9FAFB",
    mutedText: "CBD5E1",
    accent: "38BDF8",
    accentSoft: "0F3A4A",
    border: "334155",
    inverseText: "0F172A",
    fontFace: "Aptos"
  }
};

export function resolveTheme(themeName: PresentationTheme | undefined): RendererTheme {
  return themes[themeName ?? "business-clean"];
}
