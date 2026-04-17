import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MessageSources from "@/components/message/MessageSources";
import type { SourceItem } from "@/types/chat";

describe("MessageSources", () => {
  it("renders the link heading and remaining count", () => {
    const sources: SourceItem[] = [
      { title: "A", link: "https://example.com/a" },
      { title: "B", link: "https://example.com/b" },
      { title: "C", link: "https://example.com/c" },
      { title: "D", link: "https://example.com/d" },
    ];

    const html = renderToStaticMarkup(
      <MessageSources sources={sources} sourceDisplayCount={2} />
    );

    expect(html).toContain("参照リンク");
    expect(html).toContain("残り ");
    expect(html).toContain("2");
    expect(html).toContain(" 件");
  });

  it("renders nothing when there are no sources", () => {
    const html = renderToStaticMarkup(<MessageSources sources={[]} />);
    expect(html).toBe("");
  });
});
