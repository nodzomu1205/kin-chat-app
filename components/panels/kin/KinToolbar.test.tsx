import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import KinToolbar from "@/components/panels/kin/KinToolbar";

describe("KinToolbar", () => {
  it("renders the reset button with the rotation arrow", () => {
    const html = renderToStaticMarkup(
      <KinToolbar onTransfer={() => {}} onReset={() => {}} />
    );

    expect(html).toContain("↻");
    expect(html).not.toContain(">×<");
  });
});
