import type { MultipartAssembly } from "@/types/chat";

export const MULTIPART_ASSEMBLIES_KEY = "multipart_assemblies";

export function normalizeMultipartAssemblies(value: unknown) {
  if (!Array.isArray(value)) return [] as MultipartAssembly[];
  return value.filter(
    (item): item is MultipartAssembly =>
      !!item &&
      typeof item === "object" &&
      typeof (item as MultipartAssembly).id === "string" &&
      Array.isArray((item as MultipartAssembly).parts) &&
      typeof (item as MultipartAssembly).assembledText === "string"
  );
}

export function loadMultipartAssembliesFromStorage() {
  if (typeof window === "undefined") return [] as MultipartAssembly[];
  const saved = window.localStorage.getItem(MULTIPART_ASSEMBLIES_KEY);
  if (!saved) return [] as MultipartAssembly[];

  try {
    return normalizeMultipartAssemblies(JSON.parse(saved));
  } catch {
    return [] as MultipartAssembly[];
  }
}
