"use client";

import React from "react";
import MessageBubble from "@/components/message/MessageBubble";
import type { Message } from "@/types/chat";

type Props = {
  messages: Message[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  loadingText?: string | null;
};

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
          <div
            style={{
              padding: "8px 0",
              fontSize: 13,
              color: "#666",
            }}
          >
            考え中...
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}