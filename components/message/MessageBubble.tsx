import React from "react";
import MessageContent from "./MessageContent";
import MessageSources from "./MessageSources";

type Source = {
  title: string;
  link: string;
};

type Props = {
  role: "user" | "gpt" | "kin";
  text: string;
  sources?: Source[];
};

export default function MessageBubble({ role, text, sources = [] }: Props) {
  const isUser = role === "user";
  const isKin = role === "kin";

  const background = isUser
    ? "rgba(217, 240, 255, 0.84)"
    : "rgba(255, 255, 255, 0.64)";
  const borderColor = isUser ? "#b6ddf5" : "#d9d9d9";

  return (
    <div
      style={{
        maxWidth: "74%",
        minWidth: 0,
        marginLeft: isUser ? "auto" : 0,
        marginRight: isUser ? 0 : "auto",
        padding: "10px 12px",
        borderRadius: 16,
        background,
        border: `1px solid ${borderColor}`,
        lineHeight: 1.55,
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        boxSizing: "border-box",
        boxShadow: isUser
          ? "0 1px 2px rgba(59,130,246,0.08)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        fontSize: 14,
      }}
    >
      {!isUser && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isKin ? "#6a00ff" : "#10a37f",
            marginBottom: 5,
            letterSpacing: 0.2,
          }}
        >
          {isKin ? "Kindroid" : "ChatGPT"}
        </div>
      )}

      <MessageContent text={text} />
      <MessageSources sources={sources} />
    </div>
  );
}