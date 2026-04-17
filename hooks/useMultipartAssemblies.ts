import { useEffect, useMemo, useState } from "react";
import {
  loadMultipartAssembliesFromStorage,
  MULTIPART_ASSEMBLIES_KEY,
} from "@/lib/app/multipartAssembliesState";
import type { MultipartAssembly } from "@/types/chat";

export function useMultipartAssemblies() {
  const [multipartAssemblies, setMultipartAssemblies] = useState<MultipartAssembly[]>(
    loadMultipartAssembliesFromStorage
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      MULTIPART_ASSEMBLIES_KEY,
      JSON.stringify(multipartAssemblies)
    );
  }, [multipartAssemblies]);

  const deleteMultipartAssembly = (assemblyId: string) => {
    setMultipartAssemblies((prev) => prev.filter((item) => item.id !== assemblyId));
  };

  const loadMultipartAssemblyText = (assemblyId: string) =>
    multipartAssemblies.find((item) => item.id === assemblyId)?.assembledText || "";

  const getMultipartAssembly = (assemblyId: string) =>
    multipartAssemblies.find((item) => item.id === assemblyId) || null;

  const multipartById = useMemo(
    () => new Map(multipartAssemblies.map((item) => [item.id, item])),
    [multipartAssemblies]
  );

  const multipartStorageMB = useMemo(() => {
    try {
      const bytes = new TextEncoder().encode(
        JSON.stringify(multipartAssemblies)
      ).length;
      return bytes / (1024 * 1024);
    } catch {
      return 0;
    }
  }, [multipartAssemblies]);

  return {
    multipartAssemblies,
    setMultipartAssemblies,
    deleteMultipartAssembly,
    loadMultipartAssemblyText,
    getMultipartAssembly,
    multipartById,
    multipartStorageMB,
  };
}
