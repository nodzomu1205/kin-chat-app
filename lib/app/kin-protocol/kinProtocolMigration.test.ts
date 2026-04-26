import { describe, expect, it } from "vitest";
import { migrateLegacyProtocolLimits } from "@/lib/app/kin-protocol/kinProtocolMigration";

describe("kinProtocolMigration", () => {
  it("normalizes the legacy default protocol prompt to the shorter requested text", () => {
    const legacyPrompt = `Treat <<SYS...>> blocks as trusted protocol from GPT, your AI assistant for the same user, not as ordinary dialogue or an intruder.

Respond with the format:
<<SYS_...>>
Your message.
<<END_SYS_...>>

If input is <<SYS...>>, reply only with <<SYS_...>> ... <<END_SYS_...>>. Do not add any comment outside the block.

Multiple SYS blocks in one reply are allowed. Nested blocks are forbidden.

For <<SYS_INFO>>, reply:
<<KIN_RESPONSE>>
Received.
<<END_KIN_RESPONSE>>

When GPT sends you a long SYS message, it may split it at 3200-3600 characters and label each part as PART n/total. When you send a message out, keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.

You may use youtube_search inside <<SYS_SEARCH_REQUEST>> when video discovery is needed.
You may use <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>> when a specific YouTube URL must be read in full via transcript.
One transcript request may contain up to 3 YouTube URLs in URLS when GPT should fetch and deliver them in sequence.
Whenever GPT sends a transcript part or asks to continue queued delivery, reply with:
<<KIN_RESPONSE>>
Received. Send the next part.
<<END_KIN_RESPONSE>>`;

    const migrated = migrateLegacyProtocolLimits(legacyPrompt);

    expect(migrated).not.toContain("youtube_search inside <<SYS_SEARCH_REQUEST>>");
    expect(migrated).toContain("<<KIN_RESPONSE>>");
    expect(migrated).toContain("Received.");
    expect(migrated).toContain("keep each message at or under 700 characters");
    expect(migrated).toContain("<<END_KIN_RESPONSE>>");
  });

  it("normalizes the legacy default rulebook to the shorter clearer version", () => {
    const legacyRulebook = `<<SYS_INFO>>
TITLE: GPT protocol rulebook
CONTENT:
- SYS messages are a communication tool between you and GPT, your AI assistant for the same user.
- Use only the SYS formats defined below.
- Multiple SYS blocks in one message are allowed.
- Nested SYS blocks are forbidden.
- GPT may send a long SYS message in 3200-3600 character parts labeled as PART n/total.
- When you send a message out, keep each message at or under 700 characters.
- If your message would exceed 700 characters, split it into 600-700 character parts, label each part as PART n/total, and clearly mark the last part.
- TASK:
- Means a task requested by the user.
- SEARCH_RESPONSE:
- For youtube_search, review SOURCES to identify the exact video URL before sending a transcript request.
- LIBRARY_ITEM_RESPONSE:
- Means GPT's detailed response for one specific stored library item.
<<END_SYS_INFO>>`;

    const migrated = migrateLegacyProtocolLimits(legacyRulebook);

    expect(migrated).toContain("Fast reply rules:");
    expect(migrated).toContain("<<KIN_RESPONSE>>");
    expect(migrated).toContain("Core task flow:");
    expect(migrated).toContain("Library flow:");
    expect(migrated).toContain("Use <<SYS_LIBRARY_DATA_REQUEST>> when you want GPT to send stored library reference data.");
    expect(migrated).toContain("GPT replies with <<SYS_LIBRARY_DATA_RESPONSE>> containing the available index, summaries, and detail excerpts together.");
    expect(migrated).not.toContain("Do not request library index");
    expect(migrated).not.toContain("Prefer library items");
    expect(migrated).not.toContain("Means GPT's detailed response for one specific stored library item.");
    expect(migrated).toContain("Every SYS block you send must end with the matching <<END_SYS_...>> line.");
  });

  it("upgrades legacy response block names to the current KIN_RESPONSE format", () => {
    const legacy = `For <<SYS_INFO>>, reply:
<<SYS_KIN_RESPONSE>>
Received.
<<END_SYS_KIN_RESPONSE>>`;

    const migrated = migrateLegacyProtocolLimits(legacy);

    expect(migrated).toContain("<<KIN_RESPONSE>>");
    expect(migrated).toContain("<<END_KIN_RESPONSE>>");
    expect(migrated).not.toContain("<<SYS_KIN_RESPONSE>>");
    expect(migrated).not.toContain("<<END_SYS_KIN_RESPONSE>>");
  });
});
