import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import KinHeader from "@/components/panels/kin/KinHeader";

describe("KinHeader", () => {
  it("renders the main header labels", () => {
    const html = renderToStaticMarkup(
      <KinHeader
        currentKinLabel={null}
        kinStatus="connected"
        onToggleKinList={() => {}}
        onToggleConnectForm={() => {}}
      />
    );

    expect(html).toContain("Kindroid");
    expect(html).toContain("Kin一覧");
    expect(html).toContain("接続");
    expect(html).toContain("Kin未選択");
  });
});
