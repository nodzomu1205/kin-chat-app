declare module "@/kin-presentation-renderer/dist/renderer.js" {
  import type { PresentationSpec } from "@/lib/app/presentation/presentationTypes";

  export function renderPresentationToFile(
    spec: PresentationSpec,
    outputPath: string
  ): Promise<void>;
}

declare module "@/kin-presentation-renderer/dist/schema.js" {
  import type { PresentationSpec } from "@/lib/app/presentation/presentationTypes";

  export function parsePresentationSpec(input: unknown): PresentationSpec;
}
