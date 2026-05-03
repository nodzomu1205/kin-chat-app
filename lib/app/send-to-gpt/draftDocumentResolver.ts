import type { Message } from "@/types/chat";
import { parseProtocolBlockFields } from "@/lib/task/taskProtocolParser";

export type ResolvedDraftDocument = {
  documentId: string;
  title: string;
  text: string;
};

type DraftResponseBlock = {
  documentId: string;
  title: string;
  body: string;
  responseMode?: string;
};

function normalizeResponseMode(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/[\s_-]+/g, "") || "";
}

function isPartialResponseMode(value: string | undefined) {
  return normalizeResponseMode(value).startsWith("partial");
}

function collectDraftResponseBlocks(messages: Message[]): DraftResponseBlock[] {
  const blockRegex =
    /<<SYS_(?:DRAFT_(?:PREPARATION|MODIFICATION)|PPT_DESIGN)_RESPONSE>>([\s\S]*?)<<END_SYS_(?:DRAFT_(?:PREPARATION|MODIFICATION)|PPT_DESIGN)_RESPONSE>>/gi;

  return messages.flatMap((message) =>
    [...message.text.matchAll(blockRegex)].map((match) => {
      const fields = parseProtocolBlockFields(match[1] ?? "");
      const body = fields.BODY?.trim() || "";
      return {
        documentId:
          fields.DOCUMENT_ID?.trim() ||
          body.match(/^Document ID\s*:\s*(.+)$/im)?.[1]?.trim() ||
          "",
        title: fields.TITLE?.trim() || "",
        body,
        responseMode: fields.RESPONSE_MODE,
      };
    })
  );
}

function inferDocumentIdForBlock(
  blocks: DraftResponseBlock[],
  blockIndex: number
) {
  const directDocumentId = blocks[blockIndex]?.documentId;
  if (directDocumentId) return directDocumentId;

  for (let index = blockIndex - 1; index >= 0; index -= 1) {
    const documentId = blocks[index]?.documentId;
    if (documentId) return documentId;
  }

  return "";
}

export function isUnknownDocumentId(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "unknown" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none" ||
    normalized === "\u672a\u6307\u5b9a" ||
    normalized === "\u4e0d\u660e"
  );
}

export function findLatestDraftDocumentId(messages: Message[]) {
  const blocks = collectDraftResponseBlocks(messages);

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (!block || isPartialResponseMode(block.responseMode) || !block.body) {
      continue;
    }
    const documentId = inferDocumentIdForBlock(blocks, index);
    if (documentId) return documentId;
  }

  return "";
}

export function resolveDraftDocumentId(args: {
  requestedDocumentId?: string;
  messages: Message[];
}) {
  return isUnknownDocumentId(args.requestedDocumentId)
    ? findLatestDraftDocumentId(args.messages)
    : args.requestedDocumentId?.trim() || "";
}

export function extractDraftDocumentFromMessages(args: {
  messages: Message[];
  documentId: string;
}): ResolvedDraftDocument | null {
  const escapedDocumentId = args.documentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = collectDraftResponseBlocks(args.messages);

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (!block || isPartialResponseMode(block.responseMode) || !block.body) {
      continue;
    }
    if (inferDocumentIdForBlock(blocks, index) === args.documentId) {
      return {
        documentId: args.documentId,
        title: block.title || args.documentId,
        text: block.body,
      };
    }
  }

  for (const message of [...args.messages].reverse()) {
    if (
      new RegExp(`DOCUMENT_ID:\\s*${escapedDocumentId}\\b`, "i").test(
        message.text.replace(/DOCUMENT\s+ID/gi, "DOCUMENT_ID")
      )
    ) {
      const fields = parseProtocolBlockFields(message.text);
      const body = fields.BODY?.trim();
      if (body) {
        return {
          documentId: args.documentId,
          title: fields.TITLE?.trim() || args.documentId,
          text: body,
        };
      }
    }
  }

  return null;
}
