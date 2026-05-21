"use client";

import React, { useMemo, useRef, useState } from "react";
import type { KinProfile } from "@/types/chat";
import {
  buildKinToKinLimitNotice,
  buildKinToKinRelayBlock,
  buildKinToKinStartBlock,
  buildKinToKinSummaryRequest,
  parseKinToKinChatReply,
  type KinToKinTranscriptEntry,
} from "@/lib/app/kin-to-kin/kinToKinChat";

type Props = {
  kinList: KinProfile[];
  sendKinToKinMessage: (
    kinId: string,
    text: string,
    speakerLabel: string
  ) => Promise<string>;
  requestSummary: (text: string) => void | Promise<void>;
};

type SessionStatus = "idle" | "running" | "paused" | "completed" | "error";

function resolveMaxCount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

export default function KinToKinChatDrawer({
  kinList,
  sendKinToKinMessage,
  requestSummary,
}: Props) {
  const [starterId, setStarterId] = useState(() => kinList[0]?.id || "");
  const [partnerId, setPartnerId] = useState(() => kinList[1]?.id || "");
  const [topic, setTopic] = useState("");
  const [maxCountInput, setMaxCountInput] = useState("50");
  const [summarizeOnEnd, setSummarizeOnEnd] = useState(false);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [notice, setNotice] = useState("");
  const [transcript, setTranscript] = useState<KinToKinTranscriptEntry[]>([]);
  const stopRequestedRef = useRef(false);
  const transcriptRef = useRef<KinToKinTranscriptEntry[]>([]);
  const resolvedStarterId =
    starterId && kinList.some((kin) => kin.id === starterId)
      ? starterId
      : kinList[0]?.id || "";
  const resolvedPartnerId =
    partnerId &&
    partnerId !== resolvedStarterId &&
    kinList.some((kin) => kin.id === partnerId)
      ? partnerId
      : kinList.find((kin) => kin.id !== resolvedStarterId)?.id || "";

  const availablePartners = useMemo(
    () => kinList.filter((kin) => kin.id !== resolvedStarterId),
    [kinList, resolvedStarterId]
  );
  const canStart =
    kinList.length >= 2 &&
    resolvedStarterId &&
    resolvedPartnerId &&
    resolvedStarterId !== resolvedPartnerId &&
    topic.trim() &&
    resolveMaxCount(maxCountInput) > 0 &&
    status !== "running";

  const appendEntry = (entry: KinToKinTranscriptEntry) => {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(transcriptRef.current);
  };

  const finishSession = async (params: {
    starter: KinProfile;
    partner: KinProfile;
    reason: "limit" | "stopped";
  }) => {
    setStatus(params.reason === "limit" ? "completed" : "paused");
    if (params.reason === "limit") {
      const noticeBlock = buildKinToKinLimitNotice({
        maxCount: resolveMaxCount(maxCountInput),
        topic: topic.trim(),
      });
      await sendKinToKinMessage(params.starter.id, noticeBlock, params.starter.label);
      await sendKinToKinMessage(params.partner.id, noticeBlock, params.partner.label);
    }
    if (summarizeOnEnd && transcriptRef.current.length > 0) {
      await requestSummary(
        buildKinToKinSummaryRequest({
          topic: topic.trim(),
          entries: transcriptRef.current,
        })
      );
    }
  };

  const startSession = async () => {
    const starter = kinList.find((kin) => kin.id === resolvedStarterId);
    const partner = kinList.find((kin) => kin.id === resolvedPartnerId);
    if (!starter || !partner || !canStart) return;
    const maxCount = resolveMaxCount(maxCountInput);

    stopRequestedRef.current = false;
    transcriptRef.current = [];
    setTranscript([]);
    setStatus("running");
    setNotice("");

    try {
      let sender = starter;
      let receiver = partner;
      let outbound = buildKinToKinStartBlock({
        starter: starter.label,
        partner: partner.label,
        topic: topic.trim(),
        maxCount,
      });

      for (let count = 1; count <= maxCount; count += 1) {
        if (stopRequestedRef.current) {
          await finishSession({ starter, partner, reason: "stopped" });
          return;
        }

        const reply = await sendKinToKinMessage(sender.id, outbound, sender.label);
        if (!reply.trim()) {
          setStatus("error");
          setNotice(`${sender.label} から有効な返信を受信できませんでした。`);
          return;
        }

        const parsed = parseKinToKinChatReply(reply, {
          from: sender.label,
          to: receiver.label,
        });
        const entry = {
          id: `kin-chat-${Date.now()}-${count}`,
          from: parsed.from,
          to: parsed.to,
          text: parsed.text,
          count,
          maxCount,
          createdAt: new Date().toISOString(),
        };
        appendEntry(entry);

        if (count >= maxCount) {
          await finishSession({ starter, partner, reason: "limit" });
          return;
        }

        outbound = buildKinToKinRelayBlock({
          from: entry.from,
          to: entry.to,
          message: entry.text,
          topic: topic.trim(),
          count,
          maxCount,
        });
        [sender, receiver] = [receiver, sender];
      }
    } catch (error) {
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "Kin間チャットに失敗しました。");
    }
  };

  return (
    <div style={drawerStyle}>
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Kin間チャット</div>
          <div style={bodyStyle}>
            2名のKinを順番に呼び出し、返信を相手Kinへ転送します。
          </div>
        </div>
        <span style={statusPillStyle}>{status}</span>
      </div>

      {kinList.length < 2 ? (
        <div style={alertStyle}>Kinを2名以上登録すると利用できます。</div>
      ) : (
        <>
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>開始Kin</span>
              <select
                value={resolvedStarterId}
                disabled={status === "running"}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setStarterId(next);
                  if (resolvedPartnerId === next) {
                    setPartnerId(kinList.find((kin) => kin.id !== next)?.id || "");
                  }
                }}
                style={inputStyle}
              >
                {kinList.map((kin) => (
                  <option key={kin.id} value={kin.id}>
                    {kin.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>相手Kin</span>
              <select
                value={resolvedPartnerId}
                disabled={status === "running"}
                onChange={(event) => setPartnerId(event.currentTarget.value)}
                style={inputStyle}
              >
                {availablePartners.map((kin) => (
                  <option key={kin.id} value={kin.id}>
                    {kin.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>会話上限</span>
              <input
                type="number"
                min={1}
                max={200}
                disabled={status === "running"}
                value={maxCountInput}
                onChange={(event) => setMaxCountInput(event.currentTarget.value)}
                onBlur={() => setMaxCountInput(String(resolveMaxCount(maxCountInput)))}
                style={inputStyle}
              />
            </label>

            <div style={fieldStyle}>
              <span style={labelStyle}>終了時サマリー</span>
              <button
                type="button"
                disabled={status === "running"}
                onClick={() => setSummarizeOnEnd((current) => !current)}
                style={{
                  ...toggleButtonStyle,
                  background: summarizeOnEnd ? "#ecfeff" : "#ffffff",
                  borderColor: summarizeOnEnd ? "#99f6e4" : "#cbd5e1",
                  color: summarizeOnEnd ? "#0f766e" : "#475569",
                  opacity: status === "running" ? 0.6 : 1,
                  cursor: status === "running" ? "not-allowed" : "pointer",
                }}
                aria-pressed={summarizeOnEnd}
              >
                {summarizeOnEnd ? "ON" : "OFF"} / GPTへ要約依頼
              </button>
            </div>
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>トピック</span>
            <textarea
              value={topic}
              disabled={status === "running"}
              onChange={(event) => setTopic(event.currentTarget.value)}
              placeholder="会話させたいテーマ"
              style={{ ...inputStyle, minHeight: 58, resize: "vertical" }}
            />
          </label>

          <div style={actionsStyle}>
            <button
              type="button"
              disabled={!canStart}
              onClick={() => void startSession()}
              style={{
                ...primaryButtonStyle,
                opacity: canStart ? 1 : 0.55,
                cursor: canStart ? "pointer" : "not-allowed",
              }}
            >
              開始
            </button>
            <button
              type="button"
              disabled={status !== "running"}
              onClick={() => {
                stopRequestedRef.current = true;
                setNotice("現在の送受信が終わったら停止します。");
              }}
              style={secondaryButtonStyle}
            >
              停止
            </button>
            <button
              type="button"
              disabled={status === "running"}
              onClick={() => {
                transcriptRef.current = [];
                setTranscript([]);
                setNotice("");
                setStatus("idle");
              }}
              style={secondaryButtonStyle}
            >
              リセット
            </button>
          </div>
        </>
      )}

      {notice ? <div style={alertStyle}>{notice}</div> : null}

      <div style={transcriptStyle}>
        {transcript.length === 0 ? (
          <div style={bodyStyle}>会話ログはまだありません。</div>
        ) : (
          transcript.map((entry) => (
            <div key={entry.id} style={entryStyle}>
              <div style={entryMetaStyle}>
                {entry.count}/{entry.maxCount} {entry.from} {"->"} {entry.to}
              </div>
              <div style={entryTextStyle}>{entry.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const drawerStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 10,
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "#ddd6fe",
  background: "rgba(250,245,255,0.94)",
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#3b0764",
};

const bodyStyle: React.CSSProperties = {
  marginTop: 3,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#475569",
};

const statusPillStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#c4b5fd",
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 800,
  color: "#5b21b6",
  background: "#ffffff",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#475569",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 8,
  padding: "7px 8px",
  fontSize: 12,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#0f172a",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toggleButtonStyle: React.CSSProperties = {
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "center",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 999,
  padding: "7px 12px",
  background: "#6d28d9",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 999,
  padding: "7px 12px",
  background: "#ffffff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const alertStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#fde68a",
  background: "#fffbeb",
  color: "#92400e",
  borderRadius: 8,
  padding: 8,
  fontSize: 12,
  fontWeight: 700,
};

const transcriptStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  maxHeight: 220,
  overflow: "auto",
};

const entryStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#ddd6fe",
  background: "#ffffff",
  borderRadius: 8,
  padding: 8,
};

const entryMetaStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#6d28d9",
};

const entryTextStyle: React.CSSProperties = {
  marginTop: 4,
  whiteSpace: "pre-wrap",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#0f172a",
  overflowWrap: "anywhere",
};
