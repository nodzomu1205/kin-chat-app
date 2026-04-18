import { describe, expect, it } from "vitest";
import {
  buildKindroidRequestInit,
  buildKindroidSuccessPayload,
  extractKindroidReply,
  KINDROID_FALLBACK_REPLY,
} from "@/lib/server/kindroid/routeBuilders";

describe("kindroid route builders", () => {
  it("builds the upstream fetch init", async () => {
    const controller = new AbortController();
    const requestInit = buildKindroidRequestInit({
      apiKey: "secret",
      kinId: "KIN-1",
      message: "hello",
      signal: controller.signal,
    });

    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer secret",
    });
    expect(requestInit.body).toBe('{"ai_id":"KIN-1","message":"hello"}');
    expect(requestInit.signal).toBe(controller.signal);
  });

  it("extracts reply fields in priority order", () => {
    expect(
      extractKindroidReply({
        response: "primary",
        messages: [{ text: "secondary" }],
      })
    ).toBe("primary");

    expect(
      extractKindroidReply({
        messages: [{ text: "nested" }],
      })
    ).toBe("nested");
  });

  it("builds a success payload from either JSON or plain text", () => {
    expect(buildKindroidSuccessPayload('{"reply":"ok"}')).toEqual({
      reply: "ok",
    });

    expect(buildKindroidSuccessPayload('{"data":{}}')).toEqual({
      reply: KINDROID_FALLBACK_REPLY,
    });

    expect(buildKindroidSuccessPayload("plain text")).toEqual({
      reply: "plain text",
    });
  });
});
