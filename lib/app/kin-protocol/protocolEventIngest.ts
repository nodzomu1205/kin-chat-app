import { extractTaskProtocolEvents } from "@/lib/task/taskRuntimeProtocol";

type IngestProtocolEventFn = (
  payload: {
    text: string;
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
    events: ReturnType<typeof extractTaskProtocolEvents>;
  }
) => void;

export function createProtocolEventIngestor(
  ingestProtocolEvents: IngestProtocolEventFn
) {
  return (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => {
    const events = extractTaskProtocolEvents(text);
    if (events.length === 0) return;
    ingestProtocolEvents({ text, direction, events });
  };
}
