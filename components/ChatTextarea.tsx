"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitOnEnter?: boolean;
};

const MIN_HEIGHT = 84;
const MAX_HEIGHT = 200;

export default function ChatTextarea({
  value,
  onChange,
  onSubmit,
  submitOnEnter = true,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const nextHeight = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    adjustHeight();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        if (submitOnEnter && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      placeholder="メッセージを入力"
      style={{
        width: "100%",
        padding: "10px",
        borderRadius: 8,
        border: "1px solid #ccc",
        marginBottom: 0,
        lineHeight: 1.5,
        resize: "none",
        minHeight: MIN_HEIGHT,
        maxHeight: MAX_HEIGHT,
        boxSizing: "border-box",
        font: "inherit",
        fontSize: 15,
        WebkitAppearance: "none",
        background: "rgba(255,255,255,0.9)",
      }}
    />
  );
}