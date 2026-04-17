import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CountBadge,
  LabeledSelect,
  LabeledTextArea,
  NumberField,
  ReadonlyStatField,
  SectionHeaderRow,
  SettingsItemCard,
  TextField,
  ToggleButtons,
} from "@/components/panels/gpt/GptSettingsShared";

describe("GptSettingsShared", () => {
  it("renders section title and badge labels", () => {
    const html = renderToStaticMarkup(
      <SectionHeaderRow
        title="文脈レビュー"
        badges={<CountBadge label="承認済み" count={3} tone="info" />}
      />
    );

    expect(html).toContain("文脈レビュー");
    expect(html).toContain("承認済み 3");
  });

  it("renders toggle labels and help text", () => {
    const html = renderToStaticMarkup(
      <ToggleButtons
        label="自動プロトコル連携"
        checked
        onChange={() => {}}
        help="必要に応じて自動送信します。"
      />
    );

    expect(html).toContain("自動プロトコル連携");
    expect(html).toContain("ON");
    expect(html).toContain("OFF");
    expect(html).toContain("必要に応じて自動送信します。");
  });

  it("renders shared field labels", () => {
    const html = renderToStaticMarkup(
      <div>
        <SettingsItemCard title="SYSフォーマットルール" />
        <LabeledSelect label="出力モード" value="strict" onChange={() => {}}>
          <option value="strict">STRICT</option>
        </LabeledSelect>
        <NumberField label="文字数上限" value="1200" onChange={() => {}} />
        <TextField label="Location" value="Japan" onChange={() => {}} />
        <LabeledTextArea label="承認文面" value="Received." onChange={() => {}} />
        <ReadonlyStatField label="メモリ容量プレビュー" value="合計 12" />
      </div>
    );

    expect(html).toContain("SYSフォーマットルール");
    expect(html).toContain("出力モード");
    expect(html).toContain("文字数上限");
    expect(html).toContain("Location");
    expect(html).toContain("承認文面");
    expect(html).toContain("メモリ容量プレビュー");
    expect(html).toContain("合計 12");
  });
});
