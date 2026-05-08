export function sanitizePortableBaseName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .replace(/\.(?:txt|md|markdown|json)$/iu, "");
}

export function buildPortableSidecarFileName(args: {
  filename?: string;
  title?: string;
  fallbackBaseName: string;
  marker: string;
}) {
  const rawName = sanitizePortableBaseName(
    args.filename || args.title || args.fallbackBaseName
  );
  return `${rawName || args.fallbackBaseName}.${args.marker}.json`;
}

export function portableSidecarKey(name: string) {
  return name
    .toLowerCase()
    .replace(/\.(?:png|jpe?g|webp|gif|bmp|svg)$/u, "")
    .replace(/\.(?:txt|md|markdown|json)$/u, "")
    .replace(/\.generated-image$/u, "")
    .replace(/\.presentation-plan$/u, "")
    .replace(/\.search-context$/u, "")
    .replace(/\s*\[[\d,]+\s*chars?\]$/u, "")
    .trim();
}

export function isPortableTextSidecarName(name: string) {
  return /\.(?:txt|md|json)$/iu.test(name);
}

export function isPortableJsonSidecarName(name: string) {
  return /\.json$/iu.test(name);
}

export function isPortablePresentationPlanTextName(name: string) {
  return /\.(?:txt|md|markdown)$/iu.test(name);
}
