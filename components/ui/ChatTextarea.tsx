"use client";

import React from "react";
import { CHAT_TEXTAREA_TEXT } from "@/components/ui/commonUiText";

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
  placeholder = CHAT_TEXTAREA_TEXT.placeholder,
}: Props) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "auto";

    const lineHeight = 24;
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;

    if (!value.trim()) {
      element.style.height = `${minHeight}px`;
      return;
    }

    element.style.height = `${Math.min(
      Math.max(element.scrollHeight, minHeight),
      maxHeight
    )}px`;
  }, [maxRows, minRows, value]);

  React.useEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      onKeyDown={(event) => {
        if (!submitOnEnter) return;
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
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
