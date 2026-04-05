"use client";

import React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitOnEnter?: boolean;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatTextarea({
  value,
  onChange,
  onSubmit,
  submitOnEnter = true,
  minRows = 3,
  maxRows = 12,
  disabled = false,
  placeholder = "メッセージを入力",
}: Props) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const lineHeight = 24;
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;

    el.style.height = `${Math.min(
      Math.max(el.scrollHeight, minHeight),
      maxHeight
    )}px`;
  }, [minRows, maxRows]);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      onKeyDown={(e) => {
        if (!submitOnEnter) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      style={{
        width: "100%",
        resize: "none",
        overflowY: "auto",
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: "12px 14px",
        fontSize: 14,
        lineHeight: 1.6,
        outline: "none",
        boxSizing: "border-box",
        background: disabled ? "#f9fafb" : "#ffffff",
      }}
    />
  );
}