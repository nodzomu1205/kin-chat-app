import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", ".next", "node_modules"]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".cjs",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const decoder = new TextDecoder("utf-8", { fatal: true });
const invalidFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(join(dir, entry.name));
      }
      continue;
    }

    if (!entry.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    const path = join(dir, entry.name);
    try {
      decoder.decode(readFileSync(path));
    } catch {
      invalidFiles.push(relative(ROOT, path));
    }
  }
}

walk(ROOT);

if (invalidFiles.length > 0) {
  console.error("Invalid UTF-8 files:");
  for (const file of invalidFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("UTF-8 check passed.");
