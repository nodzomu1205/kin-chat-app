"use client";

import React, { useEffect, useState } from "react";
import ChatTextarea from "@/components/ChatTextarea";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  isMobile?: boolean;
};

export default function KinComposer({
  value,
  onChange,
  onSubmit,
  loading,
  isMobile = false,
}: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!loading) {
      setBlink(false);
      return;
    }

    const id = window.setInterval(() => {
      setBlink((prev) => !prev);
    }, 520);

    return () => window.clearInterval(id);
  }, [loading]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 8,
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <ChatTextarea
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          submitOnEnter={!isMobile}
        />
      </div>

      <button
        type="button"
        style={{
          width: 56,
          minWidth: 56,
          maxWidth: 56,
          alignSelf: "stretch",
          flexShrink: 0,
          border: "none",
          background: "#2563eb",
          color: "#fff",
          cursor: loading ? "default" : "pointer",
          fontWeight: 700,
          fontSize: 14,
          boxSizing: "border-box",
          borderRadius: 18,
          opacity: loading ? (blink ? 0.55 : 1) : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 6px",
          writingMode: "vertical-rl",
          textOrientation: "upright",
          lineHeight: 1.1,
          letterSpacing: "0.08em",
          transition: "opacity 180ms ease",
        }}
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? "通信中" : "送信"}
      </button>
    </div>
  );
}
