import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import KinToolbar from "@/components/panels/kin/KinToolbar";
import { KIN_PANEL_TEXT } from "@/components/panels/kin/kinUiText";

describe("KinToolbar", () => {
  it("renders the reset and compact transfer controls", () => {
    const html = renderToStaticMarkup(
      <KinToolbar onTransfer={() => {}} onReset={() => {}} />
    );

    expect(html).toContain(KIN_PANEL_TEXT.resetButton);
    expect(html).toContain(KIN_PANEL_TEXT.sendToGpt);
    expect(html).not.toContain(">×");
  });
});
