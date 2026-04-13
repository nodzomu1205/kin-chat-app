import { buildKinSysInfoBlock } from "@/lib/app/kinStructuredProtocol";
import { splitTextIntoKinChunks } from "@/lib/app/transformIntent";

export function buildYouTubeTranscriptKinBlocks(params: {
  cleanTranscript: string;
  title?: string;
  channelName?: string;
  url?: string;
}) {
  const chunks = splitTextIntoKinChunks(params.cleanTranscript, 3600, 260);

  return chunks.map((chunk, index) =>
    buildKinSysInfoBlock({
      title: "YouTube Script",
      content: [
        params.title ? `Title: ${params.title}` : "",
        params.channelName ? `Channel: ${params.channelName}` : "",
        params.url ? `URL: ${params.url}` : "",
        chunk,
      ]
        .filter(Boolean)
        .join("\n\n"),
      partIndex: index + 1,
      partTotal: chunks.length,
    })
  );
}
