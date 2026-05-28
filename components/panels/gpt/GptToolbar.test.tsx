import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GptToolbar from "@/components/panels/gpt/GptToolbar";
import { GPT_TOOLBAR_TEXT } from "@/components/panels/gpt/gptUiText";
import { GPT_TOOLBAR_TEXT_OVERRIDES } from "@/components/panels/gpt/gptUiTextOverrides";

function renderToolbar(activeTab: React.ComponentProps<typeof GptToolbar>["activeTab"]) {
  return renderToStaticMarkup(
    <GptToolbar
      activeTab={activeTab}
      onChangeTab={() => {}}
      onAction={() => {}}
      onRunTask={() => {}}
      onRunDeepen={() => {}}
      onRunTaskUpdate={() => {}}
      onImportLastResponse={() => {}}
      onAttachSearchResult={() => {}}
      onSendLatestResponseToKin={() => {}}
      onSendCurrentTaskToKin={() => {}}
      onRegisterTask={() => {}}
      onTransfer={() => {}}
      onReset={() => {}}
    />
  );
}

describe("GptToolbar", () => {
  it("renders the reset button with the rotation arrow", () => {
    const html = renderToolbar("chat");

    expect(html).toContain(GPT_TOOLBAR_TEXT.reset);
    expect(html).not.toContain(">・・・");
  });

  it("shows the updated data import label on the secondary task tab", () => {
    const html = renderToolbar("task_secondary");

    expect(html).toContain(GPT_TOOLBAR_TEXT_OVERRIDES.attachSearchResult);
  });

  it("renders the supported chat instruction and transfer controls", () => {
    const html = renderToolbar("chat");

    expect(html).toContain(GPT_TOOLBAR_TEXT.translate);
    expect(html).toContain(GPT_TOOLBAR_TEXT.replyOnly);
    expect(html).toContain("EN");
    expect(html).toContain("RU");
    expect(html).toContain("JP");
    expect(html).toContain(GPT_TOOLBAR_TEXT.sendToKin);
    expect(html).toContain(GPT_TOOLBAR_TEXT.translateReplyTitle);
  });
});
