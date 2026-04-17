import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GptToolbar from "@/components/panels/gpt/GptToolbar";

describe("GptToolbar", () => {
  it("renders the reset button with the rotation arrow", () => {
    const html = renderToStaticMarkup(
      <GptToolbar
        activeTab="chat"
        onChangeTab={() => {}}
        onAction={() => {}}
        onRunTask={() => {}}
        onRunDeepen={() => {}}
        onRunTaskUpdate={() => {}}
        onImportLastResponse={() => {}}
        onAttachSearchResult={() => {}}
        onSendLatestResponseToKin={() => {}}
        onSendCurrentTaskToKin={() => {}}
        onReceiveKinResponse={() => {}}
        onTransfer={() => {}}
        onReset={() => {}}
      />
    );

    expect(html).toContain("遶奇ｽｻ");
    expect(html).not.toContain(">・・・");
  });

  it("shows the updated data import label on the secondary task tab", () => {
    const html = renderToStaticMarkup(
      <GptToolbar
        activeTab="task_secondary"
        onChangeTab={() => {}}
        onAction={() => {}}
        onRunTask={() => {}}
        onRunDeepen={() => {}}
        onRunTaskUpdate={() => {}}
        onImportLastResponse={() => {}}
        onAttachSearchResult={() => {}}
        onSendLatestResponseToKin={() => {}}
        onSendCurrentTaskToKin={() => {}}
        onReceiveKinResponse={() => {}}
        onTransfer={() => {}}
        onReset={() => {}}
      />
    );

    expect(html).toContain("データ取込");
  });
});
