"use client";

import React from "react";
import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";
import { sectionCardStyle } from "@/components/panels/gpt/gptDrawerShared";

type Props = Pick<
  GptPanelProps,
  | "protocolPrompt"
  | "protocolRulebook"
  | "onChangeProtocolPrompt"
  | "onChangeProtocolRulebook"
  | "onResetProtocolDefaults"
  | "onSetProtocolRulebookToKinDraft"
  | "onSendProtocolRulebookToKin"
>;

export default function ProtocolDrawer({
  protocolPrompt,
  protocolRulebook,
  onChangeProtocolPrompt,
  onChangeProtocolRulebook,
  onResetProtocolDefaults,
  onSetProtocolRulebookToKinDraft,
  onSendProtocolRulebookToKin,
}: Props) {
  const textAreaStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    lineHeight: 1.6,
    color: "#0f172a",
    resize: "vertical",
    background: "#fff",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    color: "#334155",
    fontWeight: 700,
    fontSize: 12,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={sectionCardStyle}>
        <div style={{ fontSize: 12, color: "#64748b" }}>常設 Prompt</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          Kindroid の prompt 欄に入れる短い基本ルールです。ここで挙動を固定します。
        </div>
        <textarea
          value={protocolPrompt}
          onChange={(event) => onChangeProtocolPrompt(event.target.value)}
          style={{ ...textAreaStyle, minHeight: 180, marginTop: 10 }}
        />
      </section>

      <section style={sectionCardStyle}>
        <div style={{ fontSize: 12, color: "#64748b" }}>詳細ルールブック</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          `SYS_INFO` として Kin に送る詳細運用ルールです。必要に応じて随時更新できます。
        </div>
        <textarea
          value={protocolRulebook}
          onChange={(event) => onChangeProtocolRulebook(event.target.value)}
          style={{ ...textAreaStyle, minHeight: 220, marginTop: 10 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={buttonStyle} onClick={onResetProtocolDefaults}>
            既定値に戻す
          </button>
          <button type="button" style={buttonStyle} onClick={onSetProtocolRulebookToKinDraft}>
            Kin送信欄にセット
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle,
              border: "1px solid #99f6e4",
              background: "#ecfeff",
              color: "#0f766e",
            }}
            onClick={onSendProtocolRulebookToKin}
          >
            SYS_INFO として Kin に送る
          </button>
        </div>
      </section>
    </div>
  );
}
