"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatTextarea from "@/components/ChatTextarea";
import type {
  FileUploadKind,
  ImageDetail,
  IngestMode,
  PostIngestAction,
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
      action: PostIngestAction;
    }
  ) => Promise<void>;
  loading: boolean;
  ingestLoading: boolean;
  canInjectFile: boolean;
  uploadKind: FileUploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  postIngestAction: PostIngestAction;
  onChangeUploadKind: (kind: FileUploadKind) => void;
  onChangeIngestMode: (mode: IngestMode) => void;
  onChangeImageDetail: (detail: ImageDetail) => void;
  onChangePostIngestAction: (action: PostIngestAction) => void;
  showFileTools: boolean;
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

const choiceButton = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: 999,
  border: active ? "1px solid #67e8f9" : "1px solid #cbd5e1",
  background: active ? "#ecfeff" : "#fff",
  color: active ? "#155e75" : "#475569",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 12px",
  cursor: "pointer",
  lineHeight: 1,
});

const verticalButtonStyle: React.CSSProperties = {
  width: 56,
  minWidth: 56,
  maxWidth: 56,
  alignSelf: "stretch",
  flexShrink: 0,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  boxSizing: "border-box",
  borderRadius: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 6px",
  writingMode: "vertical-rl",
  textOrientation: "upright",
  lineHeight: 1.1,
  letterSpacing: "0.08em",
  transition: "opacity 180ms ease",
  position: "relative",
  overflow: "hidden",
};

function getAcceptByKind(kind: FileUploadKind): string {
  if (kind === "visual") {
    return ".pdf,image/*";
  }
  return ".txt,.md,.json,.csv,.tsv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.c,.cpp,.cs,.rb,.php,.html,.css,.xml,.yml,.yaml,.sql";
}

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
  postIngestAction,
  onChangeUploadKind,
  onChangeIngestMode,
  onChangeImageDetail,
  onChangePostIngestAction,
  showFileTools,
  isMobile = false,
}: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!loading && !ingestLoading) {
      setBlink(false);
      return;
    }

    const id = window.setInterval(() => {
      setBlink((prev) => !prev);
    }, 520);

    return () => window.clearInterval(id);
  }, [loading, ingestLoading]);

  const injectDisabled = loading || ingestLoading || !canInjectFile;
  const sendDisabled = loading || ingestLoading;
  const accept = useMemo(() => getAcceptByKind(uploadKind), [uploadKind]);

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
      action: postIngestAction,
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
      {showFileTools && (
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            border: "1px solid #cbd5e1",
            borderRadius: 14,
            background: "#f8fafc",
            padding: 12,
            boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                対象:
              </span>

              <button
                type="button"
                style={choiceButton(uploadKind === "text")}
                onClick={() => onChangeUploadKind("text")}
              >
                テキスト
              </button>

              <button
                type="button"
                style={choiceButton(uploadKind === "visual")}
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                注入後処理:
              </span>

              <select
                value={postIngestAction}
                onChange={(e) =>
                  onChangePostIngestAction(e.target.value as PostIngestAction)
                }
                style={selectStyle}
                title="注入後にどこまで自動処理するか"
              >
                <option value="inject_only">注入のみ</option>
                <option value="inject_and_prep">注入＋整理</option>
                <option value="inject_prep_deepen">注入＋整理＋深堀り</option>
                <option value="attach_to_current_task">現在タスクに追加</option>
              </select>
            </div>
          </div>

          {injectDisabled ? (
            <div
              style={{
                ...verticalButtonStyle,
                cursor: "default",
                opacity: blink ? 0.55 : 0.8,
              }}
              title="ファイルを読み込んでタスク整理用の情報を作成"
            >
              {ingestLoading ? "変換中" : "注入"}
            </div>
          ) : (
            <label
              style={{
                ...verticalButtonStyle,
                cursor: "pointer",
                opacity: 1,
              }}
              title="ファイルを選択"
            >
              {ingestLoading ? "変換中" : "注入"}

              <input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
            </label>
          )}
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
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              title="入力内容をクリア"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: "1px solid #d1d5db",
                background: "rgba(255,255,255,0.92)",
                color: "#64748b",
                fontSize: 14,
                fontWeight: 800,
                lineHeight: 1,
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              ×
            </button>
          )}

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
            ...verticalButtonStyle,
            cursor: sendDisabled ? "default" : "pointer",
            opacity: sendDisabled ? (blink ? 0.55 : 1) : 1,
          }}
          onClick={onSubmit}
          disabled={sendDisabled}
          title="ChatGPTへ送信"
        >
          {loading ? "通信中" : "送信"}
        </button>
      </div>
    </div>
  );
}