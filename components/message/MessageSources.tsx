import { generateId } from "@/lib/uuid";

type Source = {
  title: string;
  link: string;
};

export default function MessageSources({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) return null;

  const visibleSources = sources.slice(0, 3);

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px dashed #ccc",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 8,
          color: "#555",
        }}
      >
        🔗 参考リンク
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleSources.map((s, i) => (
  <a
    key={`${s.link}-${i}`}
            href={s.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "8px 10px",
              borderRadius: 8,
              background: "#f1f5f9",
              color: "#2563eb",
              fontSize: "12px",
              textDecoration: "underline",
              lineHeight: 1.5,
              wordBreak: "break-all",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#e0e7ff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
            }}
          >
            {s.title || s.link}
          </a>
        ))}
      </div>

      {sources.length > 3 && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#666",
          }}
        >
          他 {sources.length - 3} 件
        </div>
      )}
    </div>
  );
}