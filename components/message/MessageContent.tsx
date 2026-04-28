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
      {renderMessageText(text)}
    </div>
  );
}

function renderMessageText(text: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+|\/generated-presentations\/[^\s]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const label = match[1] || match[3];
    const href = match[2] || match[3];
    const isGeneratedPresentation = href.startsWith("/generated-presentations/");
    const downloadName = isGeneratedPresentation ? href.split("/").pop() : undefined;
    parts.push(
      <a
        key={`${href}-${match.index}`}
        href={href}
        target={isGeneratedPresentation ? undefined : "_blank"}
        rel={isGeneratedPresentation ? undefined : "noreferrer"}
        download={downloadName}
        style={{
          color: "#2563eb",
          fontWeight: 700,
          textDecoration: "underline",
        }}
      >
        {label}
      </a>
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
