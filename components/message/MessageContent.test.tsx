import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MessageContent from "@/components/message/MessageContent";

describe("MessageContent", () => {
  it("renders markdown image links as inline images", () => {
    const html = renderToStaticMarkup(
      <MessageContent text={"Image ID: img_1\n![img_1](blob:https://app.example/image)"} />
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="blob:https://app.example/image"');
    expect(html).not.toContain(">![img_1]");
  });
});
