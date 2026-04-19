"use client";

import React, { useEffect, useState } from "react";
import ChatTextarea from "@/components/ChatTextarea";
import { GPT_COMPOSER_TEXT } from "./gptUiText";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitOnEnter?: boolean;
  placeholder?: string;
  loading: boolean;
};

const verticalButtonStyle: React.CSSProperties = {
  width: 56,
  minWidth: 56,
  maxWidth: 56,
  alignSelf: "stretch",
  flexShrink: 0,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  boxSizing: "border-box",
  borderRadius: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 6px",
  writingMode: "vertical-rl",
  textOrientation: "upright",
  lineHeight: 1.1,
  letterSpacing: "0.08em",
  transition: "opacity 180ms ease",
  position: "relative",
  overflow: "hidden",
};

export default function GptComposer({
  value,
  onChange,
  onSubmit,
  submitOnEnter = true,
  placeholder,
  loading,
}: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!loading) return;

    const id = window.setInterval(() => {
      setBlink((prev) => !prev);
    }, 520);

    return () => window.clearInterval(id);
  }, [loading]);

  const sendDisabled = loading;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 0,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              title={GPT_COMPOSER_TEXT.clearInputTitle}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: "1px solid #d1d5db",
                background: "rgba(255,255,255,0.92)",
                color: "#64748b",
                fontSize: 14,
                fontWeight: 800,
                lineHeight: 1,
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              {GPT_COMPOSER_TEXT.clearInputButton}
            </button>
          )}

          <ChatTextarea
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitOnEnter={submitOnEnter}
            placeholder={placeholder}
          />
        </div>

        <button
          type="button"
          style={{
            ...verticalButtonStyle,
            cursor: sendDisabled ? "default" : "pointer",
            opacity: sendDisabled ? (blink ? 0.55 : 1) : 1,
          }}
          onClick={onSubmit}
          disabled={sendDisabled}
          title={GPT_COMPOSER_TEXT.submitTitle}
        >
          {loading ? GPT_COMPOSER_TEXT.sending : GPT_COMPOSER_TEXT.send}
        </button>
      </div>
    </div>
  );
}
