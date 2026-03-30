"use client";

import React from "react";
import MessageBubble from "@/components/message/MessageBubble";
import type { Message } from "@/types/chat";

type Props = {
  messages: Message[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  loadingText?: string | null;
};

function TypingIndicator({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(0,0,0,0.06)",
        width: "fit-content",
        maxWidth: "90%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", gap: 4 }} aria-hidden>
        {[0, 1, 2].map((idx) => (
          <span
            key={idx}
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "#9ca3af",
              animation: `typingBlink 1.1s ${idx * 0.16}s infinite ease-in-out`,
              display: "inline-block",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 600 }}>
        {text}
      </span>
      <style jsx>{`
        @keyframes typingBlink {
          0%,
          80%,
          100% {
            opacity: 0.35;
            transform: translateY(0px);
          }
          40% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}

export default function ChatMessages({ messages, bottomRef, loadingText }: Props) {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          padding: 12,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              width: "100%",
              display: "flex",
              marginBottom: 12,
            }}
          >
            <MessageBubble role={m.role} text={m.text} sources={m.sources} />
          </div>
        ))}

        {loadingText ? (
          <div style={{ width: "100%", display: "flex", marginBottom: 12 }}>
            <TypingIndicator text={loadingText} />
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
