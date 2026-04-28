import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parsePresentationSpec } from "./schema.js";
import { renderPresentationRequest } from "./renderRequest.js";

async function main(): Promise<void> {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: render-presentation <input.json> <output.pptx>");
    process.exitCode = 1;
    return;
  }

  const inputPath = resolve(inputArg);
  const outputPath = resolve(outputArg);
  const raw = await readFile(inputPath, "utf8");
  const spec = parsePresentationSpec(JSON.parse(raw));

  await mkdir(dirname(outputPath), { recursive: true });
  const result = await renderPresentationRequest({
    spec,
    output: {
      format: "pptx",
      path: outputPath,
    },
  });
  console.log(`Rendered ${result.slideCount} slides to ${result.outputPath}`);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
