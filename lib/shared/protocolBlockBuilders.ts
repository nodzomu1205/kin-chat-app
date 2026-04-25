export function buildProtocolLine(label: string, value: string) {
  return `${label}: ${value}`;
}

export function buildProtocolSection(label: string, lines: string[]) {
  return [label, ...lines];
}

export function buildProtocolBlock(params: {
  name: string;
  lines: string[];
}) {
  return [
    `<<${params.name}>>`,
    ...params.lines,
    `<<END_${params.name}>>`,
  ].join("\n");
}
