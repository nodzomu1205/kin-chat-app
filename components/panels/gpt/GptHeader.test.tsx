import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GptHeader from "@/components/panels/gpt/GptHeader";

describe("GptHeader", () => {
  it("renders the main header labels", () => {
    const html = renderToStaticMarkup(
      <GptHeader
        currentKinLabel={null}
        kinStatus="connected"
        activeDrawerTab={null}
        onToggleMemory={() => {}}
        onToggleToken={() => {}}
        onToggleSettings={() => {}}
      />
    );

    expect(html).toContain("ChatGPT");
    expect(html).toContain("設定");
    expect(html).toContain("Kin未選択");
  });
});
