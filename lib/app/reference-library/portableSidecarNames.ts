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
