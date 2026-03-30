import React from "react";

type Props = {
  text: string;
};

export default function MessageContent({ text }: Props) {
  return (
    <div
      style={{
        fontSize: 14,
        lineHeight: 1.6,
        color: "#111827",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      {text}
    </div>
  );
}