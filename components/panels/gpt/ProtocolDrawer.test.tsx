import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProtocolDrawer from "@/components/panels/gpt/ProtocolDrawer";

describe("ProtocolDrawer", () => {
  it("renders stable protocol labels", () => {
    const html = renderToStaticMarkup(
      <ProtocolDrawer
        protocolPrompt=""
        protocolRulebook=""
        onChangeProtocolPrompt={() => {}}
        onChangeProtocolRulebook={() => {}}
        onResetProtocolDefaults={() => {}}
        onSetProtocolRulebookToKinDraft={() => {}}
        onSendProtocolRulebookToKin={() => {}}
      />
    );

    expect(html).toContain("常設 Prompt");
    expect(html).toContain("指示ルールブック");
    expect(html).toContain("既定値に戻す");
    expect(html).toContain("SYS_INFO として Kin に送る");
  });
});
