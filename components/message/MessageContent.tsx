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
  const pattern = /(!?)\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+|blob:[^)\s]+|data:image\/[^)\s]+)\)|(https?:\/\/[^\s]+|\/generated-presentations\/[^\s]+|blob:[^\s]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const isImageMarkdown = match[1] === "!";
    const label = match[2] || match[4];
    const href = match[3] || match[4];
    if (isImageMarkdown && (href.startsWith("blob:") || href.startsWith("data:image/"))) {
      parts.push(
        <img
          key={`${href}-${match.index}`}
          src={href}
          alt={label}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: 360,
            objectFit: "contain",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            margin: "8px 0",
          }}
        />
      );
      lastIndex = pattern.lastIndex;
      continue;
    }
    const isLegacyGeneratedPresentation = href.startsWith(
      "/generated-presentations/"
    );
    const isBlobPresentation = href.startsWith("blob:");
    const isGeneratedPresentation =
      isLegacyGeneratedPresentation || isBlobPresentation;
    const downloadName = isLegacyGeneratedPresentation
      ? href.split("/").pop()
      : isBlobPresentation
        ? label
        : undefined;
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
