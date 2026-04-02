"use client";

import React, { useEffect, useRef, useState } from "react";
import ChatTextarea from "@/components/ChatTextarea";
import { buttonPrimary } from "./gptPanelStyles";
import type {
  FileUploadKind,
  ImageDetail,
  IngestMode,
} from "./gptPanelTypes";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onInjectFile: (
    file: File,
    options: {
      kind: FileUploadKind;
      mode: IngestMode;
      detail: ImageDetail;
    }
  ) => Promise<void>;
  loading: boolean;
  ingestLoading: boolean;
  canInjectFile: boolean;
  uploadKind: FileUploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  onChangeUploadKind: (kind: FileUploadKind) => void;
  onChangeIngestMode: (mode: IngestMode) => void;
  onChangeImageDetail: (detail: ImageDetail) => void;
  showInjectTools: boolean;
  isMobile?: boolean;
};

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  padding: "0 12px",
};

const kindButtonStyle = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: 999,
  border: active ? "1px solid #67e8f9" : "1px solid #cbd5e1",
  background: active ? "#ecfeff" : "#fff",
  color: active ? "#155e75" : "#475569",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 12px",
  cursor: "pointer",
});

export default function GptComposer({
  value,
  onChange,
  onSubmit,
  onInjectFile,
  loading,
  ingestLoading,
  canInjectFile,
  uploadKind,
  ingestMode,
  imageDetail,
  onChangeUploadKind,
  onChangeIngestMode,
  onChangeImageDetail,
  showInjectTools,
  isMobile = false,
}: Props) {
  const [blink, setBlink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePickFile = () => {
    if (loading || ingestLoading || !canInjectFile) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    await onInjectFile(file, {
      kind: uploadKind,
      mode: ingestMode,
      detail: imageDetail,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 0,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".pdf,.txt,.md,.json,.csv,.tsv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.c,.cpp,.cs,.rb,.php,.html,.css,.xml,.yml,.yaml,.sql"
      />

      {showInjectTools && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#475569",
                marginRight: 2,
              }}
            >
              対象:
            </span>

            <button
              type="button"
              style={kindButtonStyle(uploadKind === "text")}
              onClick={() => onChangeUploadKind("text")}
            >
              テキスト
            </button>

            <button
              type="button"
              style={kindButtonStyle(uploadKind === "visual")}
              onClick={() => onChangeUploadKind("visual")}
            >
              画像 / PDF
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {uploadKind === "text" ? (
              <select
                value={ingestMode}
                onChange={(e) => onChangeIngestMode(e.target.value as IngestMode)}
                style={selectStyle}
                title="テキストやコードの注入方法です"
              >
                <option value="compact">テキスト: compact</option>
                <option value="full">テキスト: full</option>
              </select>
            ) : (
              <select
                value={imageDetail}
                onChange={(e) =>
                  onChangeImageDetail(e.target.value as ImageDetail)
                }
                style={selectStyle}
                title="画像やPDFの視覚記述の詳細度です"
              >
                <option value="basic">画像: basic</option>
                <option value="detailed">画像: detailed</option>
                <option value="max">画像: max</option>
              </select>
            )}

            <button
              type="button"
              onClick={handlePickFile}
              disabled={loading || ingestLoading || !canInjectFile}
              style={{
                minWidth: 80,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 800,
                cursor:
                  loading || ingestLoading || !canInjectFile
                    ? "default"
                    : "pointer",
                opacity: loading || ingestLoading || !canInjectFile ? 0.6 : 1,
                lineHeight: 1.2,
              }}
              title={
                canInjectFile
                  ? "ファイルを読み込んでKin用の情報ブロックを作成"
                  : "先にKinを接続してください"
              }
            >
              {ingestLoading ? "変換中" : "注入"}
            </button>
          </div>
        </div>
      )}

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
            ...buttonPrimary,
            width: isMobile ? 48 : 56,
            minWidth: isMobile ? 48 : 56,
            alignSelf: "stretch",
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
          disabled={loading || ingestLoading}
        >
          {loading ? "通信中" : "送信"}
        </button>
      </div>
    </div>
  );
}