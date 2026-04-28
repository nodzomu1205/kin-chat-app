import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parsePresentationPatch, applyPresentationPatch } from "./patch.js";
import { parsePresentationSpec } from "./schema.js";

async function main(): Promise<void> {
  const [, , inputArg, patchArg, outputArg] = process.argv;

  if (!inputArg || !patchArg || !outputArg) {
    console.error("Usage: patch-presentation <input.json> <patch.json> <output.json>");
    process.exitCode = 1;
    return;
  }

  const inputPath = resolve(inputArg);
  const patchPath = resolve(patchArg);
  const outputPath = resolve(outputArg);

  const spec = parsePresentationSpec(JSON.parse(await readFile(inputPath, "utf8")));
  const patch = parsePresentationPatch(JSON.parse(await readFile(patchPath, "utf8")));
  const patchedSpec = applyPresentationPatch(spec, patch);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(patchedSpec, null, 2)}\n`, "utf8");
  console.log(`Applied ${patch.operations.length} operations to ${outputPath}`);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
